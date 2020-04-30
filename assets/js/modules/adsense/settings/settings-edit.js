/**
 * AdSense Settings Edit component.
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
 * WordPress dependencies
 */
import { useEffect } from '@wordpress/element';
import { addFilter, removeFilter } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import { STORE_NAME } from '../datastore/constants';
import SettingsForm from './settings-form';
import ProgressBar from '../../../components/progress-bar';
const { useSelect, useDispatch } = Data;

export default function SettingsEdit() {
	const canSubmitChanges = useSelect( ( select ) => select( STORE_NAME ).canSubmitChanges() );
	const isDoingSubmitChanges = useSelect( ( select ) => select( STORE_NAME ).isDoingSubmitChanges() );
	const haveSettingsChanged = useSelect( ( select ) => select( STORE_NAME ).haveSettingsChanged() );

	// Rollback any temporary selections to saved values on dismount.
	// This is a bit of a hacky solution, as we'd prefer to rollback changes
	// when the "cancel" button is clicked. But we don't yet have control over
	// that section of the page, so if the component is unmounted, has changes,
	// and is not submitting those changes: we rollback.
	//
	// Technically this means we rollback right before we receive new settings
	// when they ARE saved, because the component is unmounted then and meets the
	// `haveSettingsChanged && ! isDoingSubmitChanges` criteria below.
	// But that's fine as the new settings are then immediately loaded into state
	// and there aren't any visual glitches. 🤷🏻‍♂️
	const { rollbackSettings } = useDispatch( STORE_NAME );
	useEffect( () => {
		return () => {
			if ( haveSettingsChanged && ! isDoingSubmitChanges ) {
				rollbackSettings();
			}
		};
	}, [ haveSettingsChanged, isDoingSubmitChanges ] );

	// Toggle disabled state of legacy confirm changes button.
	useEffect( () => {
		const confirm = global.document.getElementById( 'confirm-changes-adsense' );
		if ( confirm ) {
			confirm.disabled = ! canSubmitChanges;
		}
	}, [ canSubmitChanges ] );

	const { submitChanges } = useDispatch( STORE_NAME );
	useEffect( () => {
		addFilter(
			'googlekit.SettingsConfirmed',
			'googlekit.AdSenseSettingsConfirmed',
			async ( chain, module ) => {
				if ( 'adsense-module' === module ) {
					const { error } = await submitChanges() || {};
					if ( error ) {
						return Promise.reject( error );
					}
					return Promise.resolve();
				}
				return chain;
			}
		);

		return () => {
			removeFilter(
				'googlekit.SettingsConfirmed',
				'googlekit.AdSenseSettingsConfirmed',
			);
		};
	}, [] );

	let viewComponent;
	if ( isDoingSubmitChanges ) {
		viewComponent = <ProgressBar />;
	} else {
		viewComponent = <SettingsForm />;
	}

	return (
		<div className="googlesitekit-setup-module googlesitekit-setup-module--adsense">
			{ viewComponent }
		</div>
	);
}
