import { Inject, Injectable } from "@nestjs/common";
import { AuthenticationStrategy, ConfigService, ExternalAuthenticationService, RequestContext } from "@vendure/core";
import { UserExistedInAnotherStrategyError } from "./interfaces";

@Injectable()
export class CrossStrategiesChecker {
    constructor(
        @Inject(ExternalAuthenticationService) private externalAuthService: ExternalAuthenticationService,
        @Inject(ConfigService) private configService: ConfigService
    ) {}

    async check(ctx: RequestContext, email: string, againstStrategy: string, forAdmin: boolean = false) {
        const strategies = forAdmin 
            ? this.configService.authOptions.adminAuthenticationStrategy
            : this.configService.authOptions.shopAuthenticationStrategy

        for (let strategy of strategies) {
            if (strategy.name === againstStrategy) { continue }
            const user = forAdmin 
                ? await this.externalAuthService.findAdministratorUser(ctx, strategy.name, email)
                : await this.externalAuthService.findCustomerUser(ctx, strategy.name, email)
            if (user) { throw new UserExistedInAnotherStrategyError(strategy.name) }
        }
        
        return true
    }
}