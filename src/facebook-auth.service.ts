import { HttpService, Inject, Injectable } from "@nestjs/common";
import { AxiosError } from "axios";
import { THIRD_PARTY_OPTIONS_PROVIDER } from "./constants";
import { ConfigDetail, FacebookDebugTokenInfo, FacebookUserInfo, IThirdPartyAuthPluginOptions } from "./interfaces";
import path from 'path'

@Injectable()
export class FacebookAuthService {
    private endpoint: string = 'https://graph.facebook.com'
    private version: string = 'v16.0'
    private optionDetail: ConfigDetail

    constructor(
        @Inject(HttpService) private httpService: HttpService,
        @Inject(THIRD_PARTY_OPTIONS_PROVIDER) private options: Required<IThirdPartyAuthPluginOptions>
        
    ) {
        this.optionDetail = options.facebook
    }

    /**
     * The flow to verify a token will be:
     * 
     *  1. Generate app_token using client_id, and client_secret
     *  2. Inspect the token below using app_token
     *  3. Call /me endpoint on behalf of user to get user's email
     * 
     * @param token the token is retrieved from Facebook dialog in front-end
     */
    async verify(token: string) {
        const appToken = await this.generateAppToken()
        const tokenDebugInfo = await this.inspectToken(token, appToken)
        if (!tokenDebugInfo.is_valid) {
            throw new Error('Token is invalid')
        }

        if (!tokenDebugInfo.scopes.includes('email')) {
            throw new Error('User not grant "email" permission')
        }

        const userInfo = await this.getUserInfo(token)

        return userInfo
    }

    private async getUserInfo(token: string): Promise<FacebookUserInfo> {
        const url = this.constructUrl('me')
        const res = await this.httpService.get<FacebookUserInfo>(url, { 
            params: {
                fields: ['id', 'email', 'first_name', 'last_name'].join(),
            },
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }).toPromise()

        return res.data
    }

    private async inspectToken(token: string, appToken: string): Promise<FacebookDebugTokenInfo> {
        const url = this.constructUrl('debug_token', false)
        const res = await this.httpService.get<{data: FacebookDebugTokenInfo}>(url, { params: {
            input_token: token,
            access_token: appToken
        } }).toPromise()

        return res.data.data
    }

    private async generateAppToken(): Promise<string> {
        const url = this.constructUrl('oauth/access_token', false)
        
        const res = await this.httpService.get<{access_token: string}>(url, { params: {
            client_id: this.optionDetail.clientId,
            client_secret: this.optionDetail.clientSecret,
            grant_type: 'client_credentials'
        }}).toPromise()
        return res.data.access_token
    }
    
    private constructUrl(edge: string, withVersion: boolean = true) {
        const url = path.join(this.endpoint, withVersion ? this.version : '', edge)
        return url.toString()
    }
}