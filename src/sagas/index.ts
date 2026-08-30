import createSagaMiddleware from 'redux-saga';

import rootSaga from './rootSaga';

/**
 * The saga middleware. Created here so the store only has to wire it into the
 * middleware chain; starting it is a separate step (`runRootSaga`) because the
 * root saga can only run once the store has been configured.
 */
export const sagaMiddleware = createSagaMiddleware();

/** Start the root saga. Call once, immediately after the store is created. */
export function runRootSaga() {
  sagaMiddleware.run(rootSaga);
}
