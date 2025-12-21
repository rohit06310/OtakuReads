// Environment validation utility
export const validateEnvironment = () => {
  const requiredVars = [
    'VITE_RAZORPAY_KEY_ID'
  ]
  
  const missingVars = requiredVars.filter(varName => !import.meta.env[varName])
  
  if (missingVars.length > 0) {
    console.error('Missing environment variables:', missingVars)
    return false
  }
  
  console.log('Environment validation passed')
  return true
}

export const getEnvVar = (varName, defaultValue = null) => {
  const value = import.meta.env[varName]
  if (!value && defaultValue === null) {
    console.warn(`Environment variable ${varName} is not defined`)
  }
  return value || defaultValue
}