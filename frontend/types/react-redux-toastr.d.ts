declare module 'react-redux-toastr' {
  import { ComponentType } from 'react'
  export const toastr: {
    confirm: (message: string, options?: {
      okText?: string
      cancelText?: string
      onOk?: () => void
      onCancel?: () => void
    }) => void
    success: (title: string, message?: string) => void
    error: (title: string, message?: string) => void
    warning: (title: string, message?: string) => void
    info: (title: string, message?: string) => void
  }
  const ReduxToastr: ComponentType<{
    timeOut?: number
    newestOnTop?: boolean
    position?: string
    transitionIn?: string
    transitionOut?: string
    progressBar?: boolean
    closeOnToastrClick?: boolean
  }>
  export default ReduxToastr
  export function reducer(state: unknown, action: unknown): unknown
}
