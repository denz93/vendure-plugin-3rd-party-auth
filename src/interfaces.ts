import {GOOGLE_STRATEGY_NAME, FACEBOOK_STRATEGY_NAME} from './constants'

export type SUPPORTED_THIRD_PARTIES = typeof GOOGLE_STRATEGY_NAME | typeof FACEBOOK_STRATEGY_NAME

export type ConfigDetail = {
    /**
     * @description
     * This is also known as **App ID**
     * 
     * Basicaly, a provider will ask you to create an app with their platform
     * 
     * Once your app created, it will have an **id** and **secret**
     */
    clientId: string
    clientSecret: string
    /**
     * @description 
     * Enable authentication to Shop Api
     * 
     * @default
     * false
     * 
     */
}

export type IThirdPartyAuthPluginOptions = {
    [T in SUPPORTED_THIRD_PARTIES]?: ConfigDetail
}

export type GoogleAuthData = {
    token: string;
}

export type FacebookAuthData = {
    token: string;
}

export interface FacebookDebugTokenInfo {
    app_id: string
    type: 'USER'
    application: string
    expires_at: number
    is_valid: boolean
    issued_at: number
    metadata: any 
    scopes: string[]
    user_id: string
}

export interface FacebookUserInfo {
    id: string
    first_name?: string
    last_name?: string
    email: string
}

export class UserExistedInAnotherStrategyError extends Error {
    name = 'UserExistedInAnotherStrategy'
    constructor(strategy: string) {
        super()
        this.message = `User existed in "${strategy}" strategy`
    }
}