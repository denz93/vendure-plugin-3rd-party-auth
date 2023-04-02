declare global {
    namespace NodeJS {
        interface ProcessEnv {
            GOOGLE_CLIENT_ID: string;
            GOOGLE_CLIENT_SECRET: string;
            GOOGLE_TEST_EMAIL: string;
            GOOGLE_REFRESH_TOKEN: string;
            FACEBOOK_CLIENT_ID: string;
            FACEBOOK_CLIENT_SECRET: string;
            FACEBOOK_LONG_LIVE_TOKEN: string;
            FACEBOOK_TEST_EMAIL: string;
        }
    }
}

export {}