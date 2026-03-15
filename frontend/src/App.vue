<template>
  <v-app>
    <v-main>
      <v-container fill-height fluid>
        <v-row align="center" justify="center" style="height: 100vh">
          <v-col cols="12" sm="8" md="4" class="text-center">
            <h1 class="display-2 font-weight-bold mb-3">Padagaskar</h1>
            <p class="subheading mb-5">AI Fact-Checker & Rhetoric Analysis</p>

            <v-card class="pa-5" elevation="10" rounded="xl">
              <v-card-title class="justify-center">
                <h2>Welcome</h2>
              </v-card-title>
              <v-card-text>
                <div v-if="!user">
                  <p>Please sign in to access the fact-checker.</p>
                  <v-btn
                    color="primary"
                    size="large"
                    rounded="pill"
                    prepend-icon="mdi-google"
                    @click="loginWithGoogle"
                    block
                  >
                    Sign in with Google
                  </v-btn>
                </div>
                <div v-else>
                  <p>Logged in as: <strong>{{ user.email }}</strong></p>
                  <v-btn
                    color="error"
                    variant="tonal"
                    rounded="pill"
                    @click="logout"
                    block
                  >
                    Logout
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>

            <v-expand-transition>
              <v-card v-if="user" class="mt-5 pa-3 text-left" color="grey-darken-4">
                <v-card-title>GraphiQL / API Explorer</v-card-title>
                <v-card-text>
                   <p>Use the token below for the Authorization header in your GraphQL client:</p>
                   <v-text-field
                      readonly
                      label="JWT Token"
                      v-model="token"
                      append-inner-icon="mdi-content-copy"
                      @click:append-inner="copyToken"
                   ></v-text-field>
                   <v-btn
                    color="secondary"
                    variant="outlined"
                    href="/graphql"
                    target="_blank"
                    block
                   >
                    Open GraphQL Endpoint
                   </v-btn>
                </v-card-text>
              </v-card>
            </v-expand-transition>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-snackbar v-model="snackbar" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const user = ref<any>(null)
const token = ref<string>('')
const snackbar = ref(false)
const snackbarText = ref('')

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const queryToken = urlParams.get('token')

  if (queryToken) {
    localStorage.setItem('token', queryToken)
    token.value = queryToken
    // Clear URL parameters
    window.history.replaceState({}, document.title, "/")
  } else {
    token.value = localStorage.getItem('token') || ''
  }

  if (token.value) {
    fetchUser()
  }
})

async function fetchUser() {
  try {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({
        query: '{ me { id email name } }'
      })
    })
    const result = await response.json()
    if (result.data && result.data.me) {
      user.value = result.data.me
    } else {
      // Token might be invalid or expired
      logout()
    }
  } catch (error) {
    console.error('Error fetching user:', error)
  }
}

function loginWithGoogle() {
  window.location.href = 'http://localhost:4000/auth/google'
}

function logout() {
  localStorage.removeItem('token')
  user.value = null
  token.value = ''
}

function copyToken() {
  navigator.clipboard.writeText(token.value)
  snackbarText.value = 'Token copied to clipboard'
  snackbar.value = true
}
</script>

<style>
body {
  background: linear-gradient(135deg, #121212 0%, #1e1e1e 100%);
}
</style>
