import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
          <h1 className="text-lg font-semibold text-navy">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted">{this.state.error.message}</p>
          <Button
            onClick={() => {
              this.setState({ error: null })
              window.location.assign('/projects')
            }}
          >
            Return to dashboard
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

export function RouteErrorFallback() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-lg font-semibold text-navy">Page failed to load</h1>
      <p className="text-sm text-muted">Try again or return to the executive dashboard.</p>
      <Button onClick={() => window.location.assign('/projects')}>Go to projects</Button>
    </div>
  )
}
