import { createStore, combineReducers } from 'redux'
import { reducer as toastrReducer } from 'react-redux-toastr'

const rootReducer = combineReducers({
  toastr: toastrReducer,
})

export type RootState = ReturnType<typeof rootReducer>

export function makeStore() {
  return createStore(rootReducer)
}
