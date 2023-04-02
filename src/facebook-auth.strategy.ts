import { AuthenticationStrategy, ExternalAuthenticationService, Injector, RequestContext, User } from "@vendure/core";
import { DocumentNode } from "graphql";
import gql from "graphql-tag";
import { FACEBOOK_STRATEGY_NAME } from "./constants";
import { CrossStrategiesChecker } from "./cross-strategies-checker.service";
import { FacebookAuthService } from "./facebook-auth.service";
import { FacebookAuthData, UserExistedInAnotherStrategyError } from "./interfaces";

export class FacebookAuthStrategy implements AuthenticationStrategy {
    name: string = FACEBOOK_STRATEGY_NAME;
    private facebookAuthService: FacebookAuthService;
    private externalAuthService: ExternalAuthenticationService;
    private crossStrategyChecker: CrossStrategiesChecker

    defineInputType(): DocumentNode {
        return gql(`
            input FacebookAuthInput {
                token: String!
            }
        `)
    }
    async authenticate(ctx: RequestContext, data: FacebookAuthData): Promise<string | false | User> {
        try {
            const userInfo = await this.facebookAuthService.verify(data.token);
            let user = await this.externalAuthService.findCustomerUser(ctx, this.name, userInfo.email)

            if (user) return user 

            await this.crossStrategyChecker.check(ctx, userInfo.email, this.name)

            user = await this.externalAuthService.createCustomerAndUser(ctx, {
                    strategy: this.name,
                    emailAddress: userInfo.email,
                    externalIdentifier: userInfo.email,
                    verified: false,
                    firstName: userInfo.first_name??'',
                    lastName: userInfo.last_name??''
                })
            return user
        } catch (err) {
            if (err instanceof UserExistedInAnotherStrategyError) {
                return err.message
            }
            return String(err)
        }
        
    }

    init(injector: Injector) {
        this.facebookAuthService = injector.get(FacebookAuthService)
        this.externalAuthService = injector.get(ExternalAuthenticationService)
        this.crossStrategyChecker = injector.get(CrossStrategiesChecker)
    }

}