import { ref } from 'vue'
import { token } from './useAuth'

export const snackbar = ref(false)
export const snackbarText = ref('')

export function showSuccess(msg: string) {
  snackbarText.value = msg
  snackbar.value = true
}

export function showError(msg: string) {
  snackbarText.value = `Error: ${msg}`
  snackbar.value = true
}

export async function graphql(query: string, variables: any = {}) {
  try {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
      },
      body: JSON.stringify({ query, variables }),
    })
    const result = await response.json()
    if (result.errors) {
      console.error('GraphQL Errors:', result.errors)
      showError(result.errors[0].message)
      return null
    }
    return result.data
  } catch (error) {
    console.error('GraphQL Fetch Error:', error)
    showError('Network error connecting to server')
    return null
  }
}
