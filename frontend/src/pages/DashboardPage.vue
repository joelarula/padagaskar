<template>
  <v-container fluid class="pa-8">
    <v-row>
      <!-- Topic List -->
      <v-col cols="12" md="4">
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
                    "{{ text.content.slice(0, 300) }}{{ text.content.length > 300 ? '...' : '' }}"
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

    <!-- Create Topic Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-plus"
          color="primary"
          size="large"
          style="position: fixed; bottom: 32px; right: 32px;"
        />
      </template>
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
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { graphql } from '../composables/useGraphql'
import { showSuccess } from '../composables/useGraphql'

const topics = ref<any[]>([])
const currentTopic = ref<any>(null)
const loading = ref(false)
const showCreateDialog = ref(false)
const newTopic = ref({ title: '', content: '' })

onMounted(() => {
  fetchTopics()
})

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
        id title description
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
      chunkText(textId: $textId) { id content }
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
</script>
