import { Inject, Injectable } from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library';
import { THIRD_PARTY_OPTIONS_PROVIDER } from './constants';
import { IThirdPartyAuthPluginOptions } from './interfaces';
type WithRequire<T, K extends keyof T> = T & {
    [P in K]-?: T[P]
}
@Injectable()
export class GoogleAuthService {
    private googleClient: OAuth2Client;

    constructor(
        @Inject(THIRD_PARTY_OPTIONS_PROVIDER)
        private options: Required<Pick<IThirdPartyAuthPluginOptions, "google">>
    ) {

        this.googleClient = new OAuth2Client({
            clientId:  options.google.clientId,
            clientSecret: options.google.clientSecret
        })
    }

    async verify(code: string) {
        const clientId = this.options.google.clientId

        const ticket = await this.googleClient.verifyIdToken({
            idToken: code,
            audience: clientId
        })
        
        const payload = ticket.getPayload()

        if (!payload || !payload.email) {
            throw new Error('Cannot get neither ticket payload or email');
        }
        
        return payload as WithRequire<typeof payload, "email">
    }
}
interface IUserInfo {
    given_name: string
    family_name: string
}