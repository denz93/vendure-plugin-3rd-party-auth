import process from 'process'
import { createTestEnvironment, testConfig, SqljsInitializer, registerInitializer, SimpleGraphQLClient, TestServer  } from '@vendure/testing'
import { getSuperadminContext } from '@vendure/testing/lib/utils/get-superadmin-context'
import { test, expect, describe, beforeAll, afterAll, beforeEach, vitest } from 'vitest'
import path from 'path'
import { ThirdPartyAuthPlugin } from '../src/plugin.module'
import dotenv from 'dotenv'
import { initialData } from './fixtures/initial-data'
import gql from 'graphql-tag'
import { ConfigService, ExternalAuthenticationService } from '@vendure/core'
import { FACEBOOK_STRATEGY_NAME, GOOGLE_STRATEGY_NAME } from '../src/constants'
import { UserExistedInAnotherStrategyError } from '../src/interfaces'
import { FacebookAuthService } from '../src/facebook-auth.service'
import { GoogleAuthService } from '../src/google-auth.service'
dotenv.config()

registerInitializer('sqljs', new SqljsInitializer(path.join(__dirname, '__data__')))

const AUTHENTICATION_GOOGLE = gql(`
    mutation auth($token: String!) {
        authenticate(input: { google: { token: $token } }) {
            ...on CurrentUser {
                identifier
            }
            ...on InvalidCredentialsError {
                errorCode
                message
                authenticationError
            }
        }
    }
`)

const AUTHENTICATION_FACEBOOK = gql(`
    mutation auth($token: String!) {
        authenticate(input: { facebook: { token: $token } }) {
            ...on CurrentUser {
                identifier
            }
            ...on InvalidCredentialsError {
                errorCode
                message
                authenticationError
            }
        }
    }
`)

const ME = gql(`
    query me {
        me {
            identifier
        }
    }
`)

const CUSTOMER = gql(`
    query customer {
        activeCustomer {
            emailAddress
            firstName
            lastName
            user {
                verified
                identifier
            }
        }
    }
`)

const ADMIN = gql(`
    query {
        activeAdministrator {
            firstName
            lastName
            emailAddress
            user {
                verified
                identifier
            }
        }
    }
`)


const desc1 = describe('Authentication Test', () => {
    const { server, adminClient, shopClient } = createTestEnvironment({
        ...testConfig,
        plugins: [ ThirdPartyAuthPlugin.init({
            facebook: {
                clientId: process.env.FACEBOOK_CLIENT_ID,
                clientSecret: process.env.FACEBOOK_CLIENT_SECRET
            },
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET
            }
        }) ]
    })
    beforeAll(async () =>{
        await server.init({
            initialData: initialData,
            productsCsvPath: path.join(__dirname, 'fixtures/e2e-products-full.csv')

        })
    })
    afterAll(async () => {
        await server.destroy()
    })

    describe.each([
        { 
            AUTH_QUERY: AUTHENTICATION_GOOGLE, 
            TEST_EMAIL: process.env.GOOGLE_TEST_EMAIL,
            token: 'google', 
            getToken: getGoogleIdToken
        },
        { 
            AUTH_QUERY: AUTHENTICATION_FACEBOOK, 
            TEST_EMAIL: process.env.FACEBOOK_TEST_EMAIL,
            token: 'facebook', 
            getToken: getFacebookUserToken
        }

    ])('For Provider $token', ({ AUTH_QUERY, token, TEST_EMAIL, getToken }) => {
        //Facebook API does not provide field `verified` for email
        let email_verified = token === 'facebook' ? false : true;
        beforeAll(async () => {
            token = await getToken()
            expect(token).toBeTypeOf('string')
        })
    
        beforeEach(async () => {
            await shopClient.asAnonymousUser()
            await adminClient.asAnonymousUser()
            await clearAllUsers(adminClient)
        })
    
        test("authenticate a user as customer", async () => {
            const res = await shopClient.query(AUTH_QUERY, { token: token })
            expect(res.authenticate.identifier).toBe(TEST_EMAIL)
    
            const resMe = await shopClient.query(ME)
            expect(resMe.me.identifier).toBe(TEST_EMAIL)

            const resCustomer = await shopClient.query(CUSTOMER)
            expect(resCustomer.activeCustomer, 'Data not matched').toMatchObject({
                emailAddress: TEST_EMAIL,
                user: {
                    identifier: TEST_EMAIL,
                    verified: email_verified
                }
            })
    
        })

        test("authenticate a user as existing customer", async () => {
            let res = await shopClient.query(AUTH_QUERY, { token: token })
            res = await shopClient.query(AUTH_QUERY, { token: token })
            expect(res.authenticate.identifier).toBe(TEST_EMAIL)
    
            const resMe = await shopClient.query(ME)
            expect(resMe.me.identifier).toBe(TEST_EMAIL)

            const resCustomer = await shopClient.query(CUSTOMER)
            expect(resCustomer.activeCustomer, 'Data not matched').toMatchObject({
                emailAddress: TEST_EMAIL,
                user: {
                    identifier: TEST_EMAIL,
                    verified: email_verified
                }
            })
    
        })
    
    
        test("invalid token should raise error", async () => {
            const res = await shopClient.query(AUTH_QUERY, {  token: '123' })
            expect(res.authenticate).toMatchObject({
                errorCode: 'INVALID_CREDENTIALS_ERROR',
                message: 'The provided credentials are invalid'
            })
        })
    })

    describe.each([
        {
            TEST_EMAIL: process.env.GOOGLE_TEST_EMAIL,
            AUTH_QUERY: AUTHENTICATION_GOOGLE,
            token: 'google',
            getToken: getGoogleIdToken,
            existingStrategy: FACEBOOK_STRATEGY_NAME
        },
        {
            TEST_EMAIL: process.env.FACEBOOK_TEST_EMAIL,
            AUTH_QUERY: AUTHENTICATION_FACEBOOK,
            token: 'facebook',
            getToken: getFacebookUserToken,
            existingStrategy: GOOGLE_STRATEGY_NAME
        }
    ])("Cross Strategies for $token", ({ TEST_EMAIL, AUTH_QUERY, token, getToken, existingStrategy }) => {
        beforeAll(async () => {
            token = await getToken()
        })
        beforeEach(async() => {
            await shopClient.asAnonymousUser()
            await adminClient.asAnonymousUser()
            await clearAllUsers(adminClient)
        })
        test('should raise error if an email already used by other strategies', async () => {
            const externalAuthService = server.app.get(ExternalAuthenticationService)
            const adminCtx = await getSuperadminContext(server.app)
            await externalAuthService.createCustomerAndUser(
                adminCtx, 
                { 
                    strategy: existingStrategy, 
                    externalIdentifier: TEST_EMAIL, 
                    emailAddress: TEST_EMAIL,
                    verified: true,
                    firstName: '',
                    lastName: ''
                }
            )

            await shopClient.asAnonymousUser()
            const res = await shopClient.query(AUTH_QUERY, { token: token })
            expect(res.authenticate).toMatchObject({
                errorCode: 'INVALID_CREDENTIALS_ERROR',
                message: 'The provided credentials are invalid',
                authenticationError: new UserExistedInAnotherStrategyError(existingStrategy).message
            })
            
        })
    })
})

describe('Load plugin without any providers', () => {
    let server: TestServer

    beforeAll(async () => {
        const res = createTestEnvironment({
            ...testConfig,
            plugins: [
                ThirdPartyAuthPlugin.init({
    
                })
            ]
        })

        server = res.server

        await server.init({
            initialData: initialData,
            productsCsvPath: path.join(__dirname, 'fixtures/e2e-products-full.csv')
        })
    })
    afterAll(async () => {
        await server.destroy()
    })

    test('Auth services should be null', () => {
        const facebookAuthService = server.app.get(FacebookAuthService)
        const googleAuthService = server.app.get(GoogleAuthService)
        expect(facebookAuthService).toBeNull()
        expect(googleAuthService).toBeNull()
    })

    test("Auth strategy should be native only", () => {
        const configService = server.app.get(ConfigService)
        expect(configService.authOptions.shopAuthenticationStrategy.length).toBe(1)
        expect(configService.authOptions.shopAuthenticationStrategy[0].name).toBe('native')
    })
})



interface IGoogleRefreshTokenResponse {
    id_token: string
}

async function getGoogleIdToken() {
    const res = await fetch('https://www.googleapis.com/oauth2/v4/token', {
        method: 'POST',
        
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        })
    })
    const result = await res.json() as IGoogleRefreshTokenResponse
    return result.id_token
}

async function getFacebookUserToken() {
    const res = await fetch('https://graph.facebook.com/v16.0/oauth/access_token', {
        method: 'POST',
        body: new URLSearchParams({
            grant_type: "fb_exchange_token",
            client_id: process.env.FACEBOOK_CLIENT_ID,
            client_secret: process.env.FACEBOOK_CLIENT_SECRET,
            fb_exchange_token: process.env.FACEBOOK_LONG_LIVE_TOKEN
        })
    })
    const data = await res.json()
    return data.access_token as string
}

async function clearAllUsers(adminClient: SimpleGraphQLClient) {
    const GET_ADMIN = gql(`
        query getAdmins {
            administrators(options: {take: 100}) {
                items {
                    id
                    emailAddress
                }
            }
        }
    `)
    const GET_CUSTOMER = gql(`
        query getCustomers {
            customers (options: {take: 100}) {
                items {
                    id
                    emailAddress
                }
            }
        }
    `)
    const DEL_CUSTOMER = gql(`
        mutation deleteCus($id: ID!) {
            deleteCustomer(id: $id) {
                result 
                message
            }
        }
    `)
    const DEL_ADMIN = gql(`
        mutation deleteAdmin($id: ID!) {
            deleteAdministrator(id: $id) {
                result 
                message
            }
        }
    `)

    await adminClient.asSuperAdmin()

    const { administrators: {items: admins } } = await adminClient.query(GET_ADMIN) as { administrators : { items: { id: string; emailAddress: string }[] }}
    const { customers: {items: customers } } = await adminClient.query(GET_CUSTOMER) as { customers : { items: { id: string; emailAddress: string }[] }}
    
    for (let admin of admins) {
        if (admin.emailAddress === 'superadmin') { continue }
        await adminClient.query(DEL_ADMIN, {id: admin.id })
    }
    for (let customer of customers) {
        await adminClient.query(DEL_CUSTOMER, { id: customer.id })
    }

    await adminClient.asAnonymousUser()
}