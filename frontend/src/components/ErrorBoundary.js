import React from 'react';

// Global error boundary component to catch React errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error('React Error Boundary caught an error:', error, errorInfo);

    // Store error details for potential reporting
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Show simple alert to user
    setTimeout(() => {
      alert('Something went wrong. Please contact support if this issue persists.');
    }, 100);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI - simple message that doesn't interfere with app functionality
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h3 style={{ color: '#dc3545', marginBottom: '16px' }}>
            Application Error
          </h3>
          <p style={{ color: '#6c757d', marginBottom: '16px' }}>
            Something unexpected happened. The application will continue to work, but please contact support if you experience issues.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;