<template>
  <v-app theme="dark">
    <!-- Navigation Rail -->
    <v-navigation-drawer permanent rail expand-on-hover color="grey-darken-4">
      <v-list density="compact" nav>
        <v-list-item prepend-icon="mdi-home" title="Dashboard" :to="'/'" value="dashboard"></v-list-item>
        <v-list-item prepend-icon="mdi-text-box-multiple" title="Texts" :to="'/texts'" value="texts"></v-list-item>
        <v-list-item prepend-icon="mdi-folder-outline" title="Topics" :to="'/topics'" value="topics"></v-list-item>
        <v-list-item prepend-icon="mdi-shape-outline" title="Text Features" :to="'/text-features'" value="text-features"></v-list-item>
        <v-list-item prepend-icon="mdi-xml" title="GraphQL API" :to="'/graphql'" value="graphql"></v-list-item>
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
    </v-app-bar>

    <v-main>
      <!-- Not logged in -->
      <v-container v-if="!user" fluid class="pa-8">
        <div class="fill-height d-flex align-center justify-center">
          <v-card width="400" class="glass-card pa-8 text-center" rounded="xl">
            <h2 class="mb-4">Welcome to Padagaskar</h2>
            <p class="mb-8 text-grey">Please sign in to start analyzing texts and tracking rhetoric.</p>
            <v-btn color="primary" size="x-large" rounded="pill" block @click="loginWithGoogle">
              Continue with Google
            </v-btn>
          </v-card>
        </div>
      </v-container>

      <!-- Logged in - show routed page -->
      <router-view v-else />
    </v-main>

    <v-snackbar v-model="snackbar" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth, user } from './composables/useAuth'
import { snackbar, snackbarText } from './composables/useGraphql'

const { fetchUser, loginWithGoogle, logout, initAuth, token } = useAuth()

onMounted(async () => {
  initAuth()
  if (token.value) {
    await fetchUser()
  }
})
</script>

<style>
.blur-bg {
  backdrop-filter: blur(10px);
  background-color: rgba(18, 18, 18, 0.7) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
