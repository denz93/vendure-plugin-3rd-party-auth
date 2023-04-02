import { HttpModule } from '@nestjs/axios';
import { Abstract, DynamicModule, ForwardReference, HttpService, Provider, Type } from '@nestjs/common';
import { VendurePlugin, PluginCommonModule } from '@vendure/core'
import { DEFAULT_PLUGIN_OPTIONS, THIRD_PARTY_OPTIONS_PROVIDER, LIST_OF_STRATEGY } from './constants'
import { CrossStrategiesChecker } from './cross-strategies-checker.service';
import { FacebookAuthService } from './facebook-auth.service';
import { FacebookAuthStrategy } from './facebook-auth.strategy';
import { GoogleAuthService } from './google-auth.service';
import { GoogleAuthStrategy } from './google-auth.strategy';
import { IThirdPartyAuthPluginOptions } from './interfaces'

@VendurePlugin({
    imports: [PluginCommonModule, HttpModule],
    providers: [
        {
            provide: THIRD_PARTY_OPTIONS_PROVIDER,
            useFactory: () =>{ 
                return ThirdPartyAuthPlugin.options
            }
        },
        {
            provide: GoogleAuthService,
            inject: [THIRD_PARTY_OPTIONS_PROVIDER],
            useFactory: async (options: IThirdPartyAuthPluginOptions) => {
                if (!options.google) return null
                return new GoogleAuthService(options as Required<IThirdPartyAuthPluginOptions>)
            }
        },
        {
            provide: FacebookAuthService,
            inject: [THIRD_PARTY_OPTIONS_PROVIDER, HttpService],
            useFactory: async (options: IThirdPartyAuthPluginOptions, httpService) => {
                if (!options.facebook) return null
                return new FacebookAuthService(
                    httpService,
                    options as Required<IThirdPartyAuthPluginOptions>
                )
            }
        },
        CrossStrategiesChecker
    ],
    configuration: (conf) => {
        const options = ThirdPartyAuthPlugin.options
        for (let name of LIST_OF_STRATEGY) {
            const optionDetail = options[name]
            if (!optionDetail) { continue }
            const strategy = name === 'google' 
                ? new GoogleAuthStrategy()
                : new FacebookAuthStrategy()
            conf.authOptions.shopAuthenticationStrategy.push(strategy)
        }
        return conf
    }
    
})
export class ThirdPartyAuthPlugin {
    static options: IThirdPartyAuthPluginOptions
    
    static init(options: Partial<IThirdPartyAuthPluginOptions>) {
        ThirdPartyAuthPlugin.options = {
            ...DEFAULT_PLUGIN_OPTIONS,
            ...options
        }
        return ThirdPartyAuthPlugin
    }
}