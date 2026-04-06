<template>
  <v-container fluid class="pa-8">
    <div class="d-flex align-center mb-8">
      <div>
        <h1 class="text-h3 font-weight-black mb-1 gradient-text">Topics</h1>
        <p class="text-subtitle-1 text-grey-lighten-1">Manage and curate thematic collections</p>
      </div>
      <v-spacer></v-spacer>
      <v-btn
        prepend-icon="mdi-plus"
        color="primary"
        size="large"
        rounded="pill"
        elevation="8"
        class="px-6 font-weight-bold"
        @click="openCreateDialog"
      >
        New Topic
      </v-btn>
    </div>

    <!-- Search / Filter -->
    <div class="d-flex align-center mb-6 ga-4">
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="Search topics..."
        variant="solo-filled"
        density="compact"
        clearable
        hide-details
      ></v-text-field>
      <v-btn
        :color="showFilters ? 'primary' : 'default'"
        variant="tonal"
        icon="mdi-filter-variant"
        @click="showFilters = !showFilters"
      ></v-btn>
    </div>

    <!-- Advanced Filters -->
    <v-expand-transition>
      <div v-if="showFilters" class="mb-6">
        <v-card variant="outlined" class="pa-4 glass-card border-dashed">
          <v-row density="compact">
            <v-col cols="12" md="4">
              <v-text-field
                v-model="filters.startDate"
                label="Start Date"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="filters.endDate"
                label="End Date"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <TagManager v-model="filters.tags" :all-tags="allTags" label="Filter by Tags" density="compact" />
            </v-col>
          </v-row>
        </v-card>
      </div>
    </v-expand-transition>

    <!-- Topics Grid -->
    <v-row>
      <v-col
        v-for="topic in topics"
        :key="topic.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card
          class="h-100 glass-card rounded-xl border border-white border-opacity-10"
          elevation="4"
          hover
          @click="openDetail(topic)"
        >
          <v-card-text class="pa-6">
            <div class="d-flex justify-space-between align-start mb-4">
              <div class="text-h5 font-weight-bold truncate-2">
                {{ topic.title }}
              </div>
              <v-menu offset-y>
                <template v-slot:activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" @click.stop></v-btn>
                </template>
                <v-list density="compact" class="rounded-lg">
                  <v-list-item prepend-icon="mdi-pencil" title="Edit" @click="editTopic(topic)"></v-list-item>
                  <v-list-item prepend-icon="mdi-trash-can" title="Delete" color="error" @click="confirmDelete(topic)"></v-list-item>
                </v-list>
              </v-menu>
            </div>

            <p class="text-body-2 text-grey-lighten-1 mb-4 truncate-3">
              {{ topic.description || 'No description available.' }}
            </p>

            <div v-if="topic.tags?.length" class="d-flex flex-wrap gap-2 mb-4">
              <v-chip
                v-for="tag in topic.tags"
                :key="tag.id"
                size="x-small"
                variant="tonal"
                color="secondary"
              >
                {{ tag.name }}: {{ tag.value }}
              </v-chip>
            </div>

            <v-divider class="mb-4 opacity-10"></v-divider>

            <div class="d-flex align-center justify-space-between">
              <div class="text-caption text-grey">
                <v-icon size="small" class="me-1">mdi-file-document-outline</v-icon>
                {{ topic.texts?.length || 0 }} Texts
              </div>
              <v-chip
                v-if="topic.isPublished"
                size="x-small"
                color="success"
                variant="flat"
              >Published</v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Paging -->
    <div v-if="topics.length < totalCount" class="text-center mt-8">
      <v-btn
        variant="tonal"
        rounded="pill"
        prepend-icon="mdi-chevron-down"
        :loading="loading"
        @click="loadMore"
      >
        Load More ({{ topics.length }} of {{ totalCount }})
      </v-btn>
    </div>

    <!-- Empty State -->
    <div v-if="topics.length === 0 && !loading" class="text-center text-grey py-16">
      <v-icon size="64" class="mb-4">mdi-folder-open-outline</v-icon>
      <div class="text-h6">No topics found.</div>
      <v-btn color="primary" variant="text" class="mt-2" @click="openCreateDialog">
        Create your first topic
      </v-btn>
    </div>

    <!-- Dialogs -->
    <v-dialog v-model="showEditDialog" max-width="800px">
      <v-card class="glass-card rounded-xl border border-white border-opacity-10" elevation="24">
        <v-card-title class="pa-6 d-flex align-center">
          <v-icon class="me-3" color="primary">mdi-folder-edit-outline</v-icon>
          <span class="text-h5 font-weight-bold">{{ currentTopic.id ? 'Edit Topic' : 'New Topic' }}</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showEditDialog = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-6 pt-2">
          <v-text-field
            v-model="currentTopic.title"
            label="Title"
            variant="solo-filled"
            class="mb-4"
          ></v-text-field>

          <v-textarea
            v-model="currentTopic.description"
            label="Description"
            variant="solo-filled"
            rows="4"
            class="mb-4"
          ></v-textarea>

          <TagManager v-model="currentTopic.tags" :all-tags="allTags" label="Tags" class="mb-6" />

          <v-divider class="mb-6 opacity-10"></v-divider>

          <div class="d-flex align-center justify-space-between mb-4">
            <h3 class="text-h6 font-weight-bold">Linked Texts</h3>
            <v-btn
              prepend-icon="mdi-link"
              color="primary"
              variant="tonal"
              size="small"
              rounded="pill"
              @click="showTextSearch = true"
            >Link Text</v-btn>
          </div>

          <v-list v-if="currentTopic.texts?.length" bg-color="transparent" class="border border-white border-opacity-5 rounded-lg">
            <v-list-item v-for="text in currentTopic.texts" :key="text.id" rounded="xl" class="mb-2 mx-2">
              <template v-slot:prepend>
                <v-icon size="small">mdi-text-box-outline</v-icon>
              </template>
              <v-list-item-title class="text-body-2 truncate-1">
                {{ text.content.slice(0, 100) }}...
              </v-list-item-title>
              <template v-slot:append>
                <v-btn icon="mdi-link-off" color="error" variant="text" size="small" @click="unlinkText(text.id)"></v-btn>
              </template>
            </v-list-item>
          </v-list>
          <div v-else class="text-center py-8 text-grey border border-dashed border-white border-opacity-10 rounded-lg">
            No texts linked to this topic yet.
          </div>
        </v-card-text>

        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" rounded="pill" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="pill"
            class="px-8"
            :loading="loading"
            @click="saveTopic"
          >Save Topic</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <TextSearchDialog v-model="showTextSearch" @select="onTextSelected" />

    <!-- Delete Confirm -->
    <v-dialog v-model="showDeleteDialog" max-width="400px">
      <v-card class="rounded-xl pa-4">
        <v-card-title class="text-h5 font-weight-bold">Delete Topic?</v-card-title>
        <v-card-text>This action cannot be undone. All linking information for this topic will be lost.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" rounded="pill" class="px-6" @click="deleteTopic">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { graphql, showSuccess } from '../composables/useGraphql'
import TagManager from '../components/TagManager.vue'
import TextSearchDialog from '../components/TextSearchDialog.vue'

const topics = ref<any[]>([])
const loading = ref(false)
const search = ref('')
const totalCount = ref(0)
const itemsPerPage = 12
const currentPage = ref(1)

const filters = ref({
  startDate: '',
  endDate: '',
  tags: [] as any[]
})
const showFilters = ref(false)
const allTags = ref<any[]>([])

const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const showTextSearch = ref(false)
const currentTopic = ref<any>({
  id: '',
  title: '',
  description: '',
  tags: [],
  texts: []
})
const topicToDelete = ref<any>(null)

async function fetchTopics(reset = false) {
  if (reset) {
    currentPage.value = 1
    topics.value = []
  }
  loading.value = true
  
  const data = await graphql(`
    query($filter: TopicFilterInput, $skip: Int, $take: Int) {
      topics(filter: $filter, skip: $skip, take: $take) {
        items {
          id title description tags { id name value } 
          texts { id content } 
          isPublished createdAt 
        }
        totalCount
      }
    }
  `, {
    skip: (currentPage.value - 1) * itemsPerPage,
    take: itemsPerPage,
    filter: {
      search: search.value || undefined,
      startDate: filters.value.startDate || undefined,
      endDate: filters.value.endDate || undefined,
      tags: filters.value.tags.length > 0 ? filters.value.tags : undefined
    }
  })
  
  if (data?.topics) {
    if (reset) topics.value = data.topics.items
    else topics.value.push(...data.topics.items)
    totalCount.value = data.topics.totalCount
  }
  loading.value = false
}

async function fetchTags() {
  const data = await graphql(`query { tags { id name value } }`)
  if (data?.tags) allTags.value = data.tags
}

function openCreateDialog() {
  currentTopic.value = { id: '', title: '', description: '', tags: [], texts: [] }
  showEditDialog.value = true
}

function editTopic(topic: any) {
  currentTopic.value = { 
    ...topic,
    tags: topic.tags?.map((t: any) => ({ name: t.name, value: t.value })) || [],
    texts: [...(topic.texts || [])]
  }
  showEditDialog.value = true
}

async function saveTopic() {
  if (!currentTopic.value.title.trim()) return
  loading.value = true
  
  const vars: any = {
    title: currentTopic.value.title,
    description: currentTopic.value.description,
    tags: currentTopic.value.tags || []
  }

  if (currentTopic.value.id) {
    vars.id = currentTopic.value.id
    await graphql(`
      mutation($id: ID!, $title: String, $description: String, $tags: [TagInput!]) {
        updateTopic(id: $id, title: $title, description: $description, tags: $tags) { id }
      }
    `, vars)
  } else {
    await graphql(`
      mutation($title: String!, $description: String, $tags: [TagInput!]) {
        createTopic(title: $title, description: $description, tags: $tags) { id }
      }
    `, vars)
  }
  
  showEditDialog.value = false
  fetchTopics(true)
  showSuccess('Topic saved successfully')
  loading.value = false
}

function confirmDelete(topic: any) {
  topicToDelete.value = topic
  showDeleteDialog.value = true
}

async function deleteTopic() {
  if (!topicToDelete.value) return
  await graphql(`mutation($id: ID!) { deleteTopic(id: $id) }`, { id: topicToDelete.value.id })
  showDeleteDialog.value = false
  fetchTopics(true)
  showSuccess('Topic deleted')
}

// Linking logic
async function onTextSelected(text: any) {
  if (currentTopic.value.id) {
    await graphql(`
      mutation($textId: ID!, $topicId: ID!) {
        addTextToTopic(textId: $textId, topicId: $topicId) { id }
      }
    `, { textId: text.id, topicId: currentTopic.value.id })
    // Refresh the texts in the dialog
    if (!currentTopic.value.texts.some((t: any) => t.id === text.id)) {
      currentTopic.value.texts.push({ id: text.id, content: text.content })
    }
  } else {
    // If it's a new topic, just add to local array (will be linked on create if backend supports it, 
    // or link after create. For now our schema addTextToTopic needs IDs).
    // Let's assume for simplicity we link after create for now.
    currentTopic.value.texts.push({ id: text.id, content: text.content })
  }
}

async function unlinkText(textId: string) {
  if (currentTopic.value.id) {
    await graphql(`
      mutation($textId: ID!, $topicId: ID!) {
        removeTextFromTopic(textId: $textId, topicId: $topicId) { id }
      }
    `, { textId, topicId: currentTopic.value.id })
  }
  currentTopic.value.texts = currentTopic.value.texts.filter((t: any) => t.id !== textId)
}

function loadMore() {
  currentPage.value++
  fetchTopics()
}

watch(search, () => fetchTopics(true))
watch(filters, () => fetchTopics(true), { deep: true })

onMounted(() => {
  fetchTopics()
  fetchTags()
})
</script>

<style scoped>
.truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.truncate-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.truncate-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
