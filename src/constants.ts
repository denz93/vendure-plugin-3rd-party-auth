import { IThirdPartyAuthPluginOptions } from "./interfaces";

export const DEFAULT_PLUGIN_OPTIONS: IThirdPartyAuthPluginOptions = {
}

export const THIRD_PARTY_OPTIONS_PROVIDER = Symbol("THIRD_PARTY_OPTIONS_PROVIDER");

export const GOOGLE_STRATEGY_NAME = "google" as const
export const FACEBOOK_STRATEGY_NAME = "facebook" as const
export const LIST_OF_STRATEGY = [GOOGLE_STRATEGY_NAME, FACEBOOK_STRATEGY_NAME] as const