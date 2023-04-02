# Third-Party Auth Plugin for Vendure.io

[![Test CI](https://github.com/denz93/vendure-plugin-3rd-party-auth/actions/workflows/test.yml/badge.svg)](https://github.com/denz93/vendure-plugin-3rd-party-auth/actions/workflows/test.yml)
[![Publish Package to npmjs](https://github.com/denz93/vendure-plugin-3rd-party-auth/actions/workflows/publish.yml/badge.svg)](https://github.com/denz93/vendure-plugin-3rd-party-auth/actions/workflows/publish.yml)
[![Coverage](https://denz93.github.io/vendure-plugin-3rd-party-auth/badge.svg)](https://denz93.github.io/vendure-plugin-3rd-party-auth/)

A Vendure plugin allow users to be authenticated using third-party providers such as Google, Facebook, etc

## Supported Providers

- [x] Google
- [x] Facebook
- [] Twitter 
- [] More?

## What is does

Extend GraphQL mutation `authenticate`

## How to use

### 1.Install

`yarn add @denz93/vendure-plugin-3rd-party-auth`

or

`npm i --save @denz93/vendure-plugin-3rd-party-auth`

### 2. Add the plugin to `vendure-config.ts`

``` typescript
import { ThirdPartyAuthPlugin } from '@denz93/vendure-plugin-3rd-party-auth'
...
export const config: VendureConfig = {
    ...
    plugins: [
        ...
        ThirdPartyAuthPlugin.init({
            google: {
                clientId: 'xxx',
                clientSecret: 'xxx'
            },
            facebook: {
                clientId: 'xxx',
                clientSecret: 'xxx'
            }
            ...
        })
    ]
}
```

### 3. Consume Graphql mutation `authenticate`

```graphql
muation authenticate (
    input: {
        google: {
            token: "ID_TOKEN" // <== get it from Google 'sign-in' button
        }
    } {
        id
        identifier
    }
)
```

## Note

1. All strategies will need an "**id_token**" to verify and authenticate users to Vendure system.

2. "**id_token**" can be retrieved by using provider's front-end libraries. The library will handle the login process and invoke a callback with "**id_token**". Your job is to send that token to the plugin through the mutation `authenticate` above.

    > Google: https://developers.google.com/identity/gsi/web/guides/overview
    
    > Facebook: https://developers.facebook.com/docs/facebook-login/web/login-button

3. The plugin using email as identitfier, so make sure you request `"email"` permission from users.
