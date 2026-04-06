import { ref } from 'vue'
import { graphql } from './useGraphql'

export const user = ref<any>(null)
export const token = ref<string>('')

export function useAuth() {
  async function fetchUser() {
    const data = await graphql('{ me { id email name } }')
    if (data?.me) {
      user.value = data.me
    } else {
      logout()
    }
  }

  function loginWithGoogle() {
    window.location.href = 'http://localhost:4000/auth/google'
  }

  function logout() {
    localStorage.removeItem('token')
    user.value = null
    token.value = ''
    window.location.href = '/'
  }

  function initAuth() {
    const urlParams = new URLSearchParams(window.location.search)
    const queryToken = urlParams.get('token')

    if (queryToken) {
      localStorage.setItem('token', queryToken)
      token.value = queryToken
      window.history.replaceState({}, document.title, '/')
    } else {
      token.value = localStorage.getItem('token') || ''
    }
  }

  return { user, token, fetchUser, loginWithGoogle, logout, initAuth }
}
