/**
 * modules/analytics data store: profiles.
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
 * External dependencies
 */
import invariant from 'invariant';

/**
 * Internal dependencies
 */
import API from 'googlesitekit-api';
import Data from 'googlesitekit-data';
import { isValidPropertyID, parsePropertyID, isValidProfileName } from '../util';
import { STORE_NAME, PROFILE_CREATE } from './constants';
import { createFetchStore } from '../../../googlesitekit/data/create-fetch-store';
const { createRegistrySelector } = Data;

const fetchGetProfilesStore = createFetchStore( {
	baseName: 'getProfiles',
	controlCallback: ( { propertyID } ) => {
		const { accountID } = parsePropertyID( propertyID );
		return API.get( 'modules', 'analytics', 'profiles', {
			accountID,
			propertyID,
		}, {
			useCache: false,
		} );
	},
	reducerCallback: ( state, profiles, { propertyID } ) => {
		return {
			...state,
			profiles: {
				...state.profiles,
				[ propertyID ]: [ ...profiles ],
			},
		};
	},
	argsToParams: ( propertyID ) => {
		invariant( isValidPropertyID( propertyID ), 'a valid property ID is required to fetch profiles for.' );
		return { propertyID };
	},
} );

const fetchCreateProfileStore = createFetchStore( {
	baseName: 'createProfile',
	controlCallback: ( { propertyID, profileName } ) => {
		const { accountID } = parsePropertyID( propertyID );
		return API.set( 'modules', 'analytics', 'create-profile', {
			accountID,
			propertyID,
			profileName,
		} );
	},
	reducerCallback: ( state, profile, { propertyID } ) => {
		return {
			...state,
			profiles: {
				...state.profiles,
				[ propertyID ]: [
					...( state.profiles[ propertyID ] || [] ),
					profile,
				],
			},
		};
	},
	argsToParams: ( propertyID, { profileName } ) => {
		invariant( isValidPropertyID( propertyID ), 'a valid property ID is required to create a profile.' );
		invariant( isValidProfileName( profileName ), 'a valid name is required to create a profile.' );
		return { propertyID, profileName };
	},
} );

const BASE_INITIAL_STATE = {
	profiles: {},
};

const baseActions = {
	/**
	 * Creates a new Analytics profile.
	 *
	 * Creates a new Analytics profile for an existing Google Analytics
	 * account + property combination.
	 *
	 * @since 1.8.0
	 *
	 * @param {string} propertyID Google Analytics property ID.
	 * @param {Object} args Profile arguments.
	 * @param {string} args.profileName The name for a new profile.
	 * @return {Object} Object with `response` and `error`.
	 */
	*createProfile( propertyID, { profileName } ) {
		invariant( isValidPropertyID( propertyID ), 'a valid property ID is required to create a profile.' );
		invariant( isValidProfileName( profileName ), 'a valid name is required to create a profile.' );

		const { response, error } = yield fetchCreateProfileStore.actions.fetchCreateProfile( propertyID, { profileName } );
		return { response, error };
	},
};

const baseResolvers = {
	*getProfiles( propertyID ) {
		if ( ! isValidPropertyID( propertyID ) ) {
			return;
		}

		const registry = yield Data.commonActions.getRegistry();

		let profiles = registry.select( STORE_NAME ).getProfiles( propertyID );

		// Only fetch profiles if there are none received for the given account and property.
		if ( ! profiles ) {
			( { response: profiles } = yield fetchGetProfilesStore.actions.fetchGetProfiles( propertyID ) );
		}

		const profileID = registry.select( STORE_NAME ).getProfileID();
		if ( profiles && ! profileID ) {
			const profile = profiles[ 0 ] || { id: PROFILE_CREATE };
			registry.dispatch( STORE_NAME ).setProfileID( profile.id );
		}
	},
};

const baseSelectors = {
	/**
	 * Get all Google Analytics profiles this user account+property has available.
	 *
	 * Returns an array of all profiles.
	 *
	 * Returns `undefined` if accounts have not yet loaded.
	 *
	 * @since 1.8.0
	 *
	 * @param {Object} state      Data store's state.
	 * @param {string} propertyID The Analytics Property ID to fetch profiles for.
	 * @return {(Array.<Object>|undefined)} An array of Analytics profiles; `undefined` if not loaded.
	 */
	getProfiles( state, propertyID ) {
		const { profiles } = state;

		return profiles[ propertyID ];
	},

	/**
	 * Check if a profile is being created for an account and property.
	 *
	 * @since 1.8.0
	 *
	 * @param {Object} state Data store's state.
	 * @return {boolean} `true` if creating a profile, `false` if not.
	 */
	isDoingCreateProfile( state ) {
		// Since isFetchingCreateProfile holds information based on specific values but we only need
		// generic information here, we need to check whether ANY such request is in progress.
		return Object.values( state.isFetchingCreateProfile ).some( Boolean );
	},

	/**
	 * Checks if profiles are being fetched for the given account and property.
	 *
	 * @since 1.8.0
	 *
	 * @param {Object} state     Data store's state.
	 * @param {string} propertyID The Analytics Property ID to check for profile fetching.
	 * @return {boolean} `true` if fetching a profiles, `false` if not.
	 */
	isDoingGetProfiles: createRegistrySelector( ( select ) => ( state, propertyID ) => {
		return select( STORE_NAME ).isFetchingGetProfiles( propertyID );
	} ),
};

const store = Data.combineStores(
	fetchGetProfilesStore,
	fetchCreateProfileStore,
	{
		INITIAL_STATE: BASE_INITIAL_STATE,
		actions: baseActions,
		resolvers: baseResolvers,
		selectors: baseSelectors,
	}
);

export const INITIAL_STATE = store.INITIAL_STATE;
export const actions = store.actions;
export const controls = store.controls;
export const reducer = store.reducer;
export const resolvers = store.resolvers;
export const selectors = store.selectors;

export default store;
