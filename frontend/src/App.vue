<template>
  <v-app theme="dark">
    <!-- Navigation Rail -->
    <v-navigation-drawer permanent rail expand-on-hover color="grey-darken-4">
      <v-list density="compact" nav>
        <v-list-item prepend-icon="mdi-home" title="Dashboard" @click="currentView = 'analyses'" value="dashboard" :active="currentView === 'analyses'"></v-list-item>
        <v-list-item prepend-icon="mdi-text-search" title="Analyses" @click="currentView = 'analyses'" value="analyses"></v-list-item>
        <v-list-item prepend-icon="mdi-database" title="Inventory" @click="currentView = 'analyses'" value="inventory"></v-list-item>
        <v-list-item prepend-icon="mdi-xml" title="GraphQL API" @click="currentView = 'graphql'" value="graphql" :active="currentView === 'graphql'"></v-list-item>
      </v-list>
      <v-divider></v-divider>
      <v-list density="compact" nav>
        <v-list-item v-if="user" prepend-icon="mdi-account" :title="user.name || user.email"></v-list-item>
        <v-list-item v-if="user" prepend-icon="mdi-logout" title="Logout" @click="logout"></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Header bar -->
    <v-app-bar flat color="transparent" class="px-5 blur-bg">
      <v-app-bar-title class="text-h5 font-weight-black">
        Padagaskar <span class="text-primary">.ai</span>
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn v-if="!user" color="primary" variant="flat" rounded="pill" @click="loginWithGoogle">
        Sign In
      </v-btn>
      <v-btn v-else icon="mdi-plus-circle" color="primary" @click="showCreateDialog = true"></v-btn>
    </v-app-bar>

    <v-main>
      <!-- Full-screen GraphQL Explorer -->
      <iframe 
        v-if="user && currentView === 'graphql'"
        :src="graphqlUrl" 
        style="width: 100%; height: calc(100vh - 64px); border: none; background: #121212;"
      ></iframe>

      <v-container v-else fluid class="pa-8">
        <div v-if="!user" class="fill-height d-flex align-center justify-center">
          <v-card width="400" class="glass-card pa-8 text-center" rounded="xl">
            <h2 class="mb-4">Welcome to Padagaskar</h2>
            <p class="mb-8 text-grey">Please sign in to start analyzing texts and tracking rhetoric.</p>
            <v-btn color="primary" size="x-large" rounded="pill" block @click="loginWithGoogle">
              Continue with Google
            </v-btn>
          </v-card>
        </div>

        <v-row v-else>
          <!-- Topic List -->
          <v-col v-if="currentView === 'analyses'" cols="12" md="4">
            <h3 class="mb-4 d-flex align-center">
              Topics
              <v-chip class="ms-2" size="small">{{ topics.length }}</v-chip>
            </h3>
            <v-scroll-y-transition group>
              <v-card
                v-for="topic in topics"
                :key="topic.id"
                class="topic-card mb-4"
                :class="{ 'active-topic': currentTopic?.id === topic.id }"
                @click="selectTopic(topic)"
              >
                <v-card-text>
                  <div class="text-h6 mb-1">{{ topic.title }}</div>
                  <div class="text-caption text-grey">Updated {{ new Date(topic.updatedAt).toLocaleDateString() }}</div>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions>
                    <v-icon size="small" class="me-1">mdi-file-document-outline</v-icon>
                    <span class="text-caption">{{ topic.texts?.length || 0 }} Texts</span>
                    <v-spacer></v-spacer>
                </v-card-actions>
              </v-card>
            </v-scroll-y-transition>
          </v-col>

          <v-col cols="12" md="8">
            <div v-if="currentTopic" class="fade-enter">
              <v-card class="glass-card mb-6" rounded="xl">
                <v-card-title class="pa-6">
                  <div class="text-h4 font-weight-bold">{{ currentTopic.title }}</div>
                </v-card-title>
                <v-card-text class="pa-6 pt-0">
                  <v-tabs color="primary" class="mb-4">
                    <v-tab value="texts"><v-icon start>mdi-text</v-icon> Texts</v-tab>
                  </v-tabs>

                  <div v-for="text in currentTopic.texts" :key="text.id" class="mb-6">
                    <v-card variant="outlined" class="pa-4 bg-grey-darken-4">
                      <div class="text-body-1 mb-4 italic-content">
                        "{{ text.content.slice(0, 300) }}..."
                      </div>
                      <v-btn 
                        color="secondary" 
                        size="small" 
                        prepend-icon="mdi-auto-fix"
                        :loading="loading"
                        @click="triggerChunking(text.id)"
                      >
                        Generate AI Chunks
                      </v-btn>
                    </v-card>
                  </div>
                </v-card-text>
              </v-card>
            </div>
            <div v-else class="fill-height d-flex align-center justify-center text-grey">
              Select a topic to view details
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Create Topic Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600">
      <v-card rounded="xl" class="pa-4">
        <v-card-title>Analyze New Topic</v-card-title>
        <v-card-text>
          <v-text-field v-model="newTopic.title" label="Topic Title" variant="solo-filled"></v-text-field>
          <v-textarea v-model="newTopic.content" label="Primary Text Content" variant="solo-filled" rows="10"></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showCreateDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" rounded="pill" class="px-6" @click="createTopic" :loading="loading">
            Start Analysis
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const user = ref<any>(null)
const token = ref<string>('')
const snackbar = ref(false)
const snackbarText = ref('')
const loading = ref(false)

// Analysis State
const topics = ref<any[]>([])
const currentTopic = ref<any>(null)
const currentView = ref('analyses')
const newTopic = ref({ title: '', content: '' })
const showCreateDialog = ref(false)

const graphqlUrl = computed(() => {
  const token = localStorage.getItem('token')
  return token 
    ? `http://localhost:4000/graphql?token=${token}` 
    : 'http://localhost:4000/graphql'
})

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const queryToken = urlParams.get('token')

  if (queryToken) {
    localStorage.setItem('token', queryToken)
    token.value = queryToken
    window.history.replaceState({}, document.title, "/")
  } else {
    token.value = localStorage.getItem('token') || ''
  }

  if (token.value) {
    fetchUser().then(() => {
        if (user.value) fetchTopics()
    })
  }
})

async function graphql(query: string, variables: any = {}) {
  try {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({ query, variables })
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

async function fetchUser() {
  const data = await graphql('{ me { id email name } }')
  if (data?.me) {
    user.value = data.me
  } else {
    logout()
  }
}

async function fetchTopics() {
  loading.value = true
  const data = await graphql(`
    query {
      topics {
        id
        title
        updatedAt
        texts { id content sources { id url title type } }
      }
    }
  `)
  if (data?.topics) topics.value = data.topics
  loading.value = false
}

async function createTopic() {
  if (!newTopic.value.title) return
  
  loading.value = true
  const data = await graphql(`
    mutation($title: String!, $description: String) {
      createTopic(title: $title, description: $description) {
        id
        title
        description
      }
    }
  `, newTopic.value)
  
  if (data?.createTopic) {
    showCreateDialog.value = false
    newTopic.value = { title: '', content: '' }
    fetchTopics()
    showSuccess('Topic created successfully')
  }
  loading.value = false
}

async function triggerChunking(textId: string) {
  loading.value = true
  const data = await graphql(`
    mutation($textId: String!) {
      chunkText(textId: $textId) {
        id
        content
      }
    }
  `, { textId })
  
  if (data?.chunkText) {
    showSuccess(`Generated ${data.chunkText.length} chunks`)
    fetchTopics()
  }
  loading.value = false
}

function selectTopic(topic: any) {
    currentTopic.value = topic
}

function loginWithGoogle() {
  window.location.href = 'http://localhost:4000/auth/google'
}

function openGraphQLExternal() {
  window.open('http://localhost:4000/graphql', '_blank')
}

function logout() {
  localStorage.removeItem('token')
  user.value = null
  token.value = ''
  topics.value = []
  currentTopic.value = null
}

function copyToken() {
  navigator.clipboard.writeText(token.value)
  showSuccess('Token copied to clipboard')
}

function showSuccess(msg: string) {
  snackbarText.value = msg
  snackbar.value = true
}

function showError(msg: string) {
  snackbarText.value = `Error: ${msg}`
  snackbar.value = true
}
</script>

<style>
.blur-bg {
  backdrop-filter: blur(10px);
  background-color: rgba(18, 18, 18, 0.7) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.bg-dots {
  background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 32px 32px;
}

.glass-card {
  backdrop-filter: blur(16px);
  background-color: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.topic-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.topic-card:hover {
  background-color: rgba(255, 255, 255, 0.05);
  transform: translateX(8px);
}

.active-topic {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border-left: 4px solid #BB86FC !important;
}

.italic-content {
  font-family: serif;
  font-style: italic;
  font-size: 1.1rem;
  opacity: 0.8;
}

.fade-enter {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
