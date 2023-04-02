import { AuthenticationStrategy, ExternalAuthenticationService, Injector, RequestContext, User } from "@vendure/core";
import { DocumentNode } from "graphql";
import { gql } from 'graphql-tag';
import { GOOGLE_STRATEGY_NAME } from "./constants";
import { GoogleAuthData, UserExistedInAnotherStrategyError } from "./interfaces";
import { GoogleAuthService } from "./google-auth.service";
import { CrossStrategiesChecker } from "./cross-strategies-checker.service";



export class GoogleAuthStrategy implements AuthenticationStrategy {
    name: string = GOOGLE_STRATEGY_NAME;
    private googleService: GoogleAuthService;
    private externalAuthService: ExternalAuthenticationService;
    private crossStrategyChecker: CrossStrategiesChecker;

    defineInputType(): DocumentNode {
        return gql(`
            input GoogleAuthInput {
                token: String!
            }
        `);
    }
    async authenticate(ctx: RequestContext, data: GoogleAuthData): Promise<string | false | User> {
        try {
            const payload = await this.googleService.verify(data.token)
            let user = await this.externalAuthService.findCustomerUser(ctx, this.name, payload.email)
            if (user) {
                return user
            }

            await this.crossStrategyChecker.check(ctx, payload.email, this.name)

            user = await this.externalAuthService.createCustomerAndUser(ctx, {
                    emailAddress: payload.email,
                    externalIdentifier: payload.email,
                    strategy: this.name,
                    verified: payload.email_verified??false,
                    firstName: payload.given_name??'',
                    lastName: payload.family_name??''
                })
            return user

        } catch (err) {
            if (err instanceof UserExistedInAnotherStrategyError) {
                return err.message
            }
            if (typeof err === 'object' && err && 'message' in err && typeof err.message === 'string')
                return err.message
            return 'Unknown error'
        }
    }

    init(injector: Injector) {
        this.googleService = injector.get(GoogleAuthService);
        this.externalAuthService = injector.get(ExternalAuthenticationService);
        this.crossStrategyChecker = injector.get(CrossStrategiesChecker);
    }

}