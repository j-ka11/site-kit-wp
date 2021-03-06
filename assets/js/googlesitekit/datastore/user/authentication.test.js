/**
 * core/user Data store: Authentication info tests.
 *
 * Site Kit by Google, Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Internal dependencies
 */
import API from 'googlesitekit-api';
import {
	createTestRegistry,
	muteConsole,
	muteFetch,
	subscribeUntil,
	unsubscribeFromAll,
} from '../../../../../tests/js/utils';
import { STORE_NAME } from './constants';

describe( 'core/user authentication', () => {
	const coreUserDataExpectedResponse = {
		authenticated: true,
		requiredScopes: [],
		grantedScopes: [],
		unsatisfiedScopes: [],
	};
	const coreUserDataEndpointRegExp = /^\/google-site-kit\/v1\/core\/user\/data\/authentication/;
	let registry;

	beforeAll( () => {
		API.setUsingCache( false );
	} );

	beforeEach( () => {
		registry = createTestRegistry();
	} );

	afterAll( () => {
		API.setUsingCache( true );
	} );

	afterEach( () => {
		unsubscribeFromAll( registry );
	} );

	describe( 'actions', () => {
		describe( 'fetchGetAuthentication', () => {
			it( 'does not require any params', () => {
				muteFetch( coreUserDataEndpointRegExp );
				expect( () => {
					registry.dispatch( STORE_NAME ).fetchGetAuthentication();
				} ).not.toThrow();
			} );
		} );
		describe( 'receiveGetAuthentication', () => {
			it( 'requires the response param', () => {
				expect( () => {
					registry.dispatch( STORE_NAME ).receiveGetAuthentication();
				} ).toThrow( 'response is required.' );
			} );
		} );
	} );

	describe( 'selectors', () => {
		describe( 'getAuthentication', () => {
			it( 'uses a resolver to make a network request', async () => {
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{ body: coreUserDataExpectedResponse, status: 200 }
				);

				const initialAuthentication = registry.select( STORE_NAME ).getAuthentication();
				// The authentication info will be its initial value while the authentication
				// info is fetched.
				expect( initialAuthentication ).toEqual( undefined );
				await subscribeUntil( registry,
					() => (
						registry.select( STORE_NAME ).getAuthentication() !== undefined
					),
				);

				const authentication = registry.select( STORE_NAME ).getAuthentication();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( authentication ).toEqual( coreUserDataExpectedResponse );

				const authenticationSelect = registry.select( STORE_NAME ).getAuthentication();
				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( authenticationSelect ).toEqual( authentication );
			} );

			it( 'does not make a network request if data is already in state', async () => {
				registry.dispatch( STORE_NAME ).receiveGetAuthentication( coreUserDataExpectedResponse );

				const authentication = registry.select( STORE_NAME ).getAuthentication();

				await subscribeUntil( registry, () => registry
					.select( STORE_NAME )
					.hasFinishedResolution( 'getAuthentication' )
				);

				expect( fetchMock ).not.toHaveFetched();
				expect( authentication ).toEqual( coreUserDataExpectedResponse );
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{ body: response, status: 500 }
				);

				muteConsole( 'error' );
				registry.select( STORE_NAME ).getAuthentication();
				await subscribeUntil( registry, () => registry
					.select( STORE_NAME )
					.hasFinishedResolution( 'getAuthentication' )
				);

				const authentication = registry.select( STORE_NAME ).getAuthentication();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( authentication ).toEqual( undefined );
			} );
		} );

		describe( 'hasScope', () => {
			it( 'uses a resolver to to load the value if not yet set', async () => {
				const grantedScope = 'https://www.googleapis.com/auth/granted.scope';
				const ungrantedScope = 'https://www.googleapis.com/auth/ungranted.scope';

				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{ body: {
						authenticated: true,
						requiredScopes: [],
						grantedScopes: [ grantedScope ],
						unsatisfiedScopes: [],
					}, status: 200 }
				);

				const hasScope = registry.select( STORE_NAME ).hasScope( grantedScope );
				// The granted scope info will be its initial value while the granted scope
				// info is fetched.
				expect( hasScope ).toEqual( undefined );
				await subscribeUntil( registry,
					() => registry.select( STORE_NAME ).hasFinishedResolution( 'getAuthentication' )
				);

				const hasScopeAfterResolved = registry.select( STORE_NAME ).hasScope( grantedScope );
				expect( hasScopeAfterResolved ).toEqual( true );

				const missingScope = registry.select( STORE_NAME ).hasScope( ungrantedScope );
				expect( missingScope ).toEqual( false );
			} );

			it( 'returns undefined if scope info is not available', async () => {
				muteFetch( coreUserDataEndpointRegExp );
				const hasProvisioningScope = registry.select( STORE_NAME ).hasScope( 'https://www.googleapis.com/auth/ungranted.scope' );
				expect( hasProvisioningScope ).toEqual( undefined );
			} );
		} );

		describe( 'isAuthenticated', () => {
			it( 'uses a resolver to to load the authenticated value if not yet set.', async () => {
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{ body: coreUserDataExpectedResponse, status: 200 }
				);

				const initialIsAuthenticated = registry.select( STORE_NAME ).isAuthenticated();
				// The autentication info will be its initial value while the authentication
				// info is fetched.
				expect( initialIsAuthenticated ).toEqual( undefined );
				await subscribeUntil( registry,
					() => (
						registry.select( STORE_NAME ).isAuthenticated() !== undefined
					),
				);

				const isAuthenticated = registry.select( STORE_NAME ).isAuthenticated();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( isAuthenticated ).toEqual( coreUserDataExpectedResponse.authenticated );
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{ body: response, status: 500 }
				);

				muteConsole( 'error' );
				registry.select( STORE_NAME ).isAuthenticated();
				await subscribeUntil( registry,
					() => registry.select( STORE_NAME ).hasFinishedResolution( 'getAuthentication' )
				);

				const isAuthenticated = registry.select( STORE_NAME ).isAuthenticated();
				const error = registry.select( STORE_NAME ).getError();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( isAuthenticated ).toEqual( undefined );
				expect( error ).toEqual( response );
			} );

			it( 'returns undefined if authentication info is not available', async () => {
				muteFetch( coreUserDataEndpointRegExp );
				const isAuthenticated = registry.select( STORE_NAME ).isAuthenticated();
				expect( isAuthenticated ).toEqual( undefined );
			} );
		} );

		describe( 'getGrantedScopes', () => {
			it( 'uses a resolver get all authentication info', async () => {
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{ body: coreUserDataExpectedResponse, status: 200 }
				);

				const initialGrantedScopes = registry.select( STORE_NAME ).getGrantedScopes();
				// The granted scope info will be its initial value while the granted scope
				// info is fetched.
				expect( initialGrantedScopes ).toEqual( undefined );
				await subscribeUntil( registry,
					() => (
						registry.select( STORE_NAME ).getGrantedScopes() !== undefined
					),
				);

				const grantedScopes = registry.select( STORE_NAME ).getGrantedScopes();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( grantedScopes ).toEqual( coreUserDataExpectedResponse.grantedScopes );
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{ body: response, status: 500 }
				);

				muteConsole( 'error' );
				registry.select( STORE_NAME ).getGrantedScopes();
				await subscribeUntil( registry,
					() => registry.select( STORE_NAME ).hasFinishedResolution( 'getAuthentication' )
				);

				const grantedScopes = registry.select( STORE_NAME ).getGrantedScopes();
				const error = registry.select( STORE_NAME ).getError();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( grantedScopes ).toEqual( undefined );
				expect( error ).toEqual( response );
			} );

			it( 'returns undefined if authentication info is not available', async () => {
				muteFetch( coreUserDataEndpointRegExp );
				const grantedScopes = registry.select( STORE_NAME ).getGrantedScopes();
				expect( grantedScopes ).toEqual( undefined );
			} );
		} );

		describe( 'getRequiredScopes', () => {
			it( 'uses a resolver get all authentication info', async () => {
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{ body: coreUserDataExpectedResponse, status: 200 }
				);

				const initialRequiredScopes = registry.select( STORE_NAME ).getRequiredScopes();
				// The required scope info will be its initial value while the required scope
				// info is fetched.
				expect( initialRequiredScopes ).toEqual( undefined );
				await subscribeUntil( registry,
					() => (
						registry.select( STORE_NAME ).getRequiredScopes() !== undefined
					),
				);

				const requiredScopes = registry.select( STORE_NAME ).getRequiredScopes();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( requiredScopes ).toEqual( coreUserDataExpectedResponse.requiredScopes );
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{ body: response, status: 500 }
				);

				muteConsole( 'error' );
				registry.select( STORE_NAME ).getRequiredScopes();
				await subscribeUntil( registry,
					() => registry.select( STORE_NAME ).hasFinishedResolution( 'getAuthentication' )
				);

				const requiredScopes = registry.select( STORE_NAME ).getRequiredScopes();
				const error = registry.select( STORE_NAME ).getError();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( requiredScopes ).toEqual( undefined );
				expect( error ).toEqual( response );
			} );

			it( 'returns undefined if authentication info is not available', async () => {
				muteFetch( coreUserDataEndpointRegExp );
				const requiredScopes = registry.select( STORE_NAME ).getRequiredScopes();
				expect( requiredScopes ).toEqual( undefined );
			} );
		} );

		describe( 'getUnsatisfiedScopes', () => {
			it( 'uses a resolver get all authentication info', async () => {
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{ body: coreUserDataExpectedResponse, status: 200 }
				);

				const initialUnsatisfiedScopes = registry.select( STORE_NAME ).getUnsatisfiedScopes();
				// The scopes will be their initial value until the data is resolved.
				expect( initialUnsatisfiedScopes ).toEqual( undefined );
				await subscribeUntil( registry,
					() => registry.select( STORE_NAME ).hasFinishedResolution( 'getAuthentication' )
				);

				const unsatisfiedScopes = registry.select( STORE_NAME ).getUnsatisfiedScopes();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( unsatisfiedScopes ).toEqual( coreUserDataExpectedResponse.unsatisfiedScopes );
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{
						body: JSON.stringify( response ),
						status: 500,
					}
				);

				muteConsole( 'error' );
				registry.select( STORE_NAME ).getUnsatisfiedScopes();
				await subscribeUntil( registry,
					() => registry.select( STORE_NAME ).hasFinishedResolution( 'getAuthentication' )
				);

				const unsatisfiedScopes = registry.select( STORE_NAME ).getUnsatisfiedScopes();
				const error = registry.select( STORE_NAME ).getError();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( unsatisfiedScopes ).toEqual( undefined );
				expect( error ).toEqual( response );
			} );

			it( 'returns undefined if authentication info is not available', async () => {
				muteFetch( coreUserDataEndpointRegExp );
				const unsatisfiedScopes = registry.select( STORE_NAME ).getUnsatisfiedScopes();
				expect( unsatisfiedScopes ).toEqual( undefined );
			} );
		} );

		describe( 'needsReauthentication', () => {
			it( 'uses a resolver get all reauthentication info', async () => {
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{ body: coreUserDataExpectedResponse, status: 200 }
				);

				const initialNeedsReauthentication = registry.select( STORE_NAME ).needsReauthentication();
				// The scopes will be their initial value until the data is resolved.
				expect( initialNeedsReauthentication ).toEqual( undefined );
				await subscribeUntil( registry,
					() => registry.select( STORE_NAME ).hasFinishedResolution( 'getAuthentication' )
				);

				const needsReauthentication = registry.select( STORE_NAME ).needsReauthentication();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( needsReauthentication ).toEqual( coreUserDataExpectedResponse.needsReauthentication );
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};
				fetchMock.getOnce(
					coreUserDataEndpointRegExp,
					{
						body: JSON.stringify( response ),
						status: 500,
					}
				);

				muteConsole( 'error' );
				registry.select( STORE_NAME ).needsReauthentication();
				await subscribeUntil( registry,
					() => registry.select( STORE_NAME ).hasFinishedResolution( 'getAuthentication' ),
				);

				const needsReauthentication = registry.select( STORE_NAME ).needsReauthentication();
				const error = registry.select( STORE_NAME ).getError();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( needsReauthentication ).toEqual( undefined );
				expect( error ).toEqual( response );
			} );

			it( 'returns undefined if reauthentication info is not available', async () => {
				muteFetch( coreUserDataEndpointRegExp );
				const needsReauthentication = registry.select( STORE_NAME ).needsReauthentication();

				expect( needsReauthentication ).toEqual( undefined );
			} );
		} );
	} );
} );
