'use client'

import { useRef } from 'react'
import { Provider } from 'react-redux'
import ReduxToastr from 'react-redux-toastr'
import { makeStore } from '../lib/store'
import 'react-redux-toastr/lib/css/react-redux-toastr.min.css'

export default function ReduxProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null)
  if (storeRef.current === null) {
    storeRef.current = makeStore()
  }
  const store = storeRef.current

  return (
    <Provider store={store}>
      {children}
      <ReduxToastr
        timeOut={5000}
        newestOnTop
        position="top-right"
        transitionIn="bounceIn"
        transitionOut="bounceOut"
        progressBar
        closeOnToastrClick
      />
    </Provider>
  )
}
