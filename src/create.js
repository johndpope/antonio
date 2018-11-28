import axios from 'axios';
import { take } from 'redux-saga/effects';
import { actionTypes } from 'ackee-redux-token-auth';

import * as Store from './store';
import saga from './sagas';

const authRequestProxy = methodHandler =>
    function*(...args) {
        if (!Store.get(Store.keys.IS_AUTH)) {
            if (!Store.get(Store.keys.SAGA_INITIALIZED)) {
                throw new Error(
                    `ackee-http-client: The HTTP client's 'saga' must be connected among your other sagas.`,
                );
            }

            yield take(actionTypes.ACCESS_TOKEN_AVAILABLE);
        }

        return yield methodHandler(...args);
    };

function createApiWithAxios(options, proxy) {
    const axiosClient = axios.create(options);
    const api = {};

    // - unwrap axios HTTP method handlers
    // - add custom proxies
    for (const key of Object.keys(axiosClient)) {
        const methodHandler = axiosClient[key];
        api[key] = proxy ? proxy(methodHandler) : methodHandler;
    }

    Object.freeze(api);

    return [api, axiosClient];
}

export default function create(axionsRequestConfig = {}, customConfig = {}) {
    if (Store.get(Store.keys.WAS_INITIALIZED)) {
        throw new Error(`ackee-http-client: the 'create' method may be called only once.`);
    }

    Store.set(Store.keys.WAS_INITIALIZED, true);

    const defaultConfig = Store.get(Store.keys.CONFIG);

    Store.set(Store.keys.CONFIG, {
        ...defaultConfig,
        ...customConfig,
    });

    const [api] = createApiWithAxios(axionsRequestConfig);
    const [authApi, authAxiosClient] = createApiWithAxios(axionsRequestConfig, authRequestProxy);

    Store.set(Store.keys.AUTH_AXIOS, authAxiosClient);

    return {
        api,
        authApi,
        saga,
    };
}
