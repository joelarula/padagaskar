<template>
  <v-container fluid class="pa-8">
    <div class="d-flex align-center mb-6">
      <h2 class="text-h4 font-weight-bold">Texts</h2>
      <v-chip class="ms-3" size="small">{{ texts.length }}</v-chip>
      <v-spacer></v-spacer>
      <v-btn color="primary" variant="flat" rounded="pill" prepend-icon="mdi-plus" @click="showCreateDialog = true">
        Add Text
      </v-btn>
    </div>

    <!-- Search / Filter -->
    <div class="d-flex align-center mb-6 ga-4">
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="Search texts..."
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

    <!-- Texts List -->
    <v-row>
      <v-col v-for="text in filteredTexts" :key="text.id" cols="12">
        <v-card class="glass-card" rounded="lg">
          <v-card-text class="pa-5">
            <div class="d-flex align-start">
              <div class="flex-grow-1">
                <div class="text-body-1 mb-3 italic-content">
                  "{{ text.content.slice(0, 400) }}{{ text.content.length > 400 ? '...' : '' }}"
                </div>
                <!-- Summary in Card -->
                <v-sheet v-if="text.summary" class="mb-4 pa-3 rounded-lg border-s-lg border-primary bg-grey-darken-3 border-opacity-100" elevation="1">
                  <div class="text-caption font-weight-bold text-primary mb-1 d-flex align-center">
                    <v-icon size="small" class="me-1">mdi-robot-outline</v-icon>
                    AI SUMMARY
                    <v-tooltip location="bottom">
                      <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" size="x-small" class="ms-2 opacity-60 pointer">mdi-information-outline</v-icon>
                      </template>
                      <span>{{ text.promptVersion?.template?.name || 'AI Engine' }} | Model: {{ text.aiModel?.name || 'Unknown' }} | v{{ text.promptVersion?.version || '?' }}</span>
                    </v-tooltip>
                  </div>
                  <div class="text-body-2 line-clamp-3">
                    {{ text.summary }}
                  </div>
                </v-sheet>
                <div class="d-flex align-center ga-3 flex-wrap">
                  <v-chip v-if="text.language" size="small" color="info" variant="tonal">
                    {{ text.language }}
                  </v-chip>
                  <v-chip
                    v-for="tag in text.tags"
                    :key="tag.id"
                    size="small"
                    variant="outlined"
                    closable
                    @click:close="removeTagInline(text, tag)"
                  >
                    {{ tag.name }}{{ tag.value ? `: ${tag.value}` : '' }}
                  </v-chip>
                  
                  <!-- Quick Add Tag Menu -->
                  <v-menu :close-on-content-click="false" location="bottom">
                    <template #activator="{ props }">
                      <v-btn
                        icon="mdi-tag-plus-outline"
                        variant="text"
                        size="x-small"
                        v-bind="props"
                        color="primary"
                      ></v-btn>
                    </template>
                    <v-card min-width="300" class="pa-4 rounded-lg glass-card border">
                      <div class="text-subtitle-2 mb-3">Add Quick Tag</div>
                      
                      <TagInput 
                        v-model="inlineTag" 
                        :all-tags="allTags" 
                        :hide-details="true"
                        name-cols="12"
                        value-cols="12"
                        class="mb-4"
                      />

                      <v-btn
                        color="primary"
                        block
                        rounded="pill"
                        size="small"
                        :loading="loading"
                        :disabled="!inlineTag.name"
                        @click="addInlineTag(text)"
                      >
                        Add Tag
                      </v-btn>
                    </v-card>
                  </v-menu>

                  <v-chip v-if="text.sources?.length" size="small" color="success" variant="tonal" prepend-icon="mdi-link">
                    {{ text.sources.length }} source{{ text.sources.length > 1 ? 's' : '' }}
                  </v-chip>
                  <span class="text-caption text-grey ms-auto">
                    {{ formatDate(text.createdAt) }}
                  </span>
                </div>
              </div>
              <v-btn
                icon="mdi-eye-outline"
                variant="text"
                color="primary"
                size="small"
                class="ms-2"
                @click="openDetail(text)"
              ></v-btn>
              <v-btn
                icon="mdi-pencil-outline"
                variant="text"
                color="info"
                size="small"
                class="ms-2"
                @click="openEdit(text)"
              ></v-btn>
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                color="error"
                size="small"
                class="ms-2"
                @click="confirmDelete(text)"
              ></v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <!-- Paging -->
    <div v-if="texts.length < totalCount" class="text-center mt-8">
      <v-btn
        variant="tonal"
        rounded="pill"
        prepend-icon="mdi-chevron-down"
        :loading="loading"
        @click="loadMore"
      >
        Load More ({{ texts.length }} of {{ totalCount }})
      </v-btn>
    </div>

    <div v-if="filteredTexts.length === 0 && !loading" class="text-center text-grey py-16">
      <v-icon size="64" class="mb-4">mdi-text-box-remove-outline</v-icon>
      <div class="text-h6">No texts found</div>
      <div class="text-body-2">Add a text to get started</div>
    </div>

    <!-- Create Text Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="700">
      <v-card rounded="xl" class="pa-4">
        <v-tabs v-model="createTab" color="primary" grow class="mb-4">
          <v-tab value="manual">Manual Entry</v-tab>
          <v-tab value="url">From URL</v-tab>
        </v-tabs>

        <v-window v-model="createTab">
          <v-window-item value="manual">
            <v-card-text class="pa-0">
              <v-textarea
                v-model="newText.content"
                label="Text Content"
                variant="solo-filled"
                rows="12"
                placeholder="Paste or type the text you want to analyze..."
                auto-grow
              ></v-textarea>
              <v-select
                v-model="newText.language"
                :items="languages"
                item-title="label"
                item-value="value"
                label="Language"
                variant="solo-filled"
              ></v-select>

              <v-divider class="my-4"></v-divider>
              
              <TagManager v-model="newText.tags" :all-tags="allTags" label="Tags" />

              <v-divider class="my-4"></v-divider>
              <div class="text-subtitle-2 mb-2">Source</div>
              <v-text-field
                v-model="newText.source.title"
                label="Source Title"
                variant="solo-filled"
                density="compact"
              ></v-text-field>
              <v-text-field
                v-model="newText.source.url"
                label="Source URL"
                variant="solo-filled"
                density="compact"
                placeholder="https://..."
              ></v-text-field>
              <v-select
                v-model="newText.source.type"
                :items="sourceTypes"
                label="Source Type"
                variant="solo-filled"
                density="compact"
              ></v-select>
              <v-text-field
                v-model="newText.source.description"
                label="Source Description (optional)"
                variant="solo-filled"
                density="compact"
              ></v-text-field>
            </v-card-text>
          </v-window-item>

          <v-window-item value="url">
            <v-card-text class="pa-0">
              <div class="text-body-2 mb-4 text-grey">
                Paste a URL below. We will attempt to fetch and extract the main article content automatically.
              </div>
              <v-text-field
                v-model="urlToExtract"
                label="URL to extract from"
                variant="solo-filled"
                placeholder="https://..."
                prepend-inner-icon="mdi-link-variant"
                :rules="[(v: string) => !!v || 'URL is required']"
              ></v-text-field>
              
              <div class="d-flex align-center mt-4">
                <v-icon color="info" size="small" class="me-2">mdi-information-outline</v-icon>
                <span class="text-caption text-grey">
                  The extracted text will be added as a new text entry with the URL as its source.
                </span>
              </div>
            </v-card-text>
          </v-window-item>
        </v-window>

        <v-card-actions class="mt-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showCreateDialog = false">Cancel</v-btn>
          <v-btn
            v-if="createTab === 'manual'"
            color="primary"
            variant="flat"
            rounded="pill"
            class="px-6"
            :loading="loading"
            :disabled="!newText.content.trim()"
            @click="createText"
          >
            Add Text
          </v-btn>
          <v-btn
            v-else
            color="primary"
            variant="flat"
            rounded="pill"
            class="px-6"
            :loading="loading"
            :disabled="!urlToExtract.trim()"
            @click="createTextFromUrl"
          >
            Extract & Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirm Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="xl" class="pa-4">
        <v-card-title>Delete Text?</v-card-title>
        <v-card-text>
          This will permanently remove this text and all associated data (chunks, specimens, etc.).
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" rounded="pill" :loading="loading" @click="deleteText">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Detail View Dialog -->
    <v-dialog v-model="showDetailDialog" max-width="900" scrollable>
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="d-flex align-center">
          Text Details
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showDetailDialog = false"></v-btn>
        </v-card-title>
        <v-card-text v-if="selectedText" class="pa-6 pt-2">
          <div v-if="selectedText.summary" class="mb-8 pa-4 rounded-xl border border-primary border-opacity-25 bg-primary-darken-4">
            <div class="text-overline mb-2 text-primary font-weight-bold d-flex align-center">
              <v-icon class="me-2" size="small">mdi-robot-outline</v-icon>
              Generated Summary
            </div>
            <div class="text-body-1 font-weight-medium">
              {{ selectedText.summary }}
            </div>
          </div>

          <div class="text-body-1 mb-6 text-pre-wrap whitespace-pre-wrap preserved-text">
            {{ selectedText.content }}
          </div>
          
          <v-divider class="mb-6"></v-divider>
          
          <div class="d-flex align-center ga-4 flex-wrap mb-6">
            <v-chip color="info" label>Language: {{ selectedText.language }}</v-chip>
            <v-chip v-for="tag in selectedText.tags" :key="tag.id" variant="outlined" label>
              {{ tag.name }}{{ tag.value ? `: ${tag.value}` : '' }}
            </v-chip>
          </div>

          <div v-if="selectedText.sources?.length">
            <div class="text-h6 mb-3">Sources</div>
            <v-list density="compact" class="bg-transparent pa-0">
              <v-list-item
                v-for="source in selectedText.sources"
                :key="source.id"
                :title="source.title || 'Untitled Source'"
                :subtitle="source.url"
                :prepend-icon="source.url ? 'mdi-link-variant' : 'mdi-file-outline'"
                class="glass-card mb-2 rounded-lg"
                :href="source.url"
                target="_blank"
              >
                <template #append>
                  <v-chip size="x-small" variant="tonal">{{ source.type }}</v-chip>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Edit Text Dialog -->
    <v-dialog v-model="showEditDialog" max-width="700">
      <v-card rounded="xl" class="pa-4">
        <v-card-title>Edit Text</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="editText.content"
            label="Text Content"
            variant="solo-filled"
            rows="12"
            auto-grow
          ></v-textarea>
          
          <v-textarea
            v-model="editText.summary"
            label="AI Summary"
            variant="solo-filled"
            rows="4"
            hint="The AI-generated summary of this text"
            persistent-hint
            class="mb-4"
          ></v-textarea>
          <v-select
            v-model="editText.language"
            :items="languages"
            item-title="label"
            item-value="value"
            label="Language"
            variant="solo-filled"
          ></v-select>

          <v-divider class="my-4"></v-divider>
          
          <TagManager v-model="editText.tags" :all-tags="allTags" label="Tags" />

        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="pill"
            class="px-6"
            :loading="loading"
            :disabled="!editText.content.trim()"
            @click="updateText"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { graphql, showSuccess } from '../composables/useGraphql'
import TagManager from '../components/TagManager.vue'
import TagInput from '../components/TagInput.vue'

const texts = ref<any[]>([])
const search = ref('')
const loading = ref(false)
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const showDetailDialog = ref(false)
const showEditDialog = ref(false)
const textToDelete = ref<any>(null)
const selectedText = ref<any>(null)
const createTab = ref('url')
const urlToExtract = ref('')
const allTags = ref<any[]>([])
const totalCount = ref(0)
const itemsPerPage = 20
const currentPage = ref(1)

const filters = ref({
  search: '',
  startDate: '',
  endDate: '',
  tags: [] as any[]
})

const showFilters = ref(false)

const newText = ref({
  content: '',
  summary: '',
  language: 'et',
  source: { title: '', url: '', type: 'ARTICLE', description: '' },
  tags: [] as any[]
})
const inlineTag = ref({
  name: '',
  value: ''
})
const editText = ref({
  id: '',
  content: '',
  summary: '',
  language: 'et',
  tags: [] as any[]
})

const languages = [
  { label: 'Eesti (ET)', value: 'et' },
  { label: 'English (EN)', value: 'en' },
]

const sourceTypes = ['ARTICLE', 'BOOK', 'VIDEO', 'PODCAST', 'SOCIAL_MEDIA', 'OTHER']

const filteredTexts = computed(() => {
  return texts.value
})

function formatDate(dateVal: string | number) {
  if (!dateVal) return 'No date'
  
  // Handle numeric strings (milliseconds)
  const timestamp = typeof dateVal === 'string' && /^\d+$/.test(dateVal) 
    ? parseInt(dateVal, 10) 
    : dateVal;
    
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return dateVal.toString()
  return date.toLocaleDateString()
}

onMounted(() => {
  fetchTexts()
  fetchTags()
})

async function fetchTexts(reset = false) {
  if (reset) {
    currentPage.value = 1
    texts.value = []
  }
  
  loading.value = true
  
  const variables: any = {
    skip: (currentPage.value - 1) * itemsPerPage,
    take: itemsPerPage,
    filter: {
      search: search.value || undefined,
      startDate: filters.value.startDate || undefined,
      endDate: filters.value.endDate || undefined,
      tags: filters.value.tags.length > 0 ? filters.value.tags : undefined
    }
  }

  const data = await graphql(`
    query($filter: TextFilterInput, $skip: Int, $take: Int) {
      texts(filter: $filter, skip: $skip, take: $take) {
        items {
          id
          content
          summary
          language
          createdAt
          sources { id url title type }
          tags { id name value }
          aiModel { name provider }
          promptVersion { version template { name } }
        }
        totalCount
      }
    }
  `, variables)
  
  if (data?.texts) {
    if (reset) {
      texts.value = data.texts.items
    } else {
      texts.value.push(...data.texts.items)
    }
    totalCount.value = data.texts.totalCount
  }
  loading.value = false
}

async function loadMore() {
  if (texts.value.length < totalCount.value) {
    currentPage.value++
    await fetchTexts()
  }
}

watch(search, () => {
  fetchTexts(true)
})

watch(filters, () => {
  fetchTexts(true)
}, { deep: true })

async function fetchTags() {
  const data = await graphql(`
    query {
      tags { id name value }
    }
  `)
  if (data?.tags) allTags.value = data.tags
}

async function createText() {
  if (!newText.value.content.trim()) return

  loading.value = true
  const variables: any = {
    content: newText.value.content,
  }
  if (newText.value.language) variables.language = newText.value.language
  
  // Format tags for Input
  const validTags = newText.value.tags.filter(t => t.name.trim()).map(t => ({
    name: t.name.trim(),
    value: t.value?.trim() || null
  }))
  if (validTags.length > 0) variables.tags = validTags

  if (newText.value.source.title || newText.value.source.url) {
    variables.sources = [{
      title: newText.value.source.title || undefined,
      url: newText.value.source.url || undefined,
      type: newText.value.source.type,
      description: newText.value.source.description || undefined,
    }]
  }

  const data = await graphql(`
    mutation($content: String!, $language: String, $sources: [SourceInput!], $tags: [TagInput!]) {
      createText(content: $content, language: $language, sources: $sources, tags: $tags) {
        id content summary language createdAt
        sources { id url title type }
        tags { id name value }
      }
    }
  `, variables)

  if (data?.createText) {
    texts.value.unshift(data.createText)
    newText.value = { 
      content: '', 
      summary: '', 
      language: 'et', 
      source: { title: '', url: '', type: 'ARTICLE', description: '' },
      tags: [] as any[]
    }
    showCreateDialog.value = false
    showSuccess('Text added successfully')
    fetchTags() // Refresh suggestions
  }
  loading.value = false
}

async function createTextFromUrl() {
  if (!urlToExtract.value.trim()) return

  loading.value = true
  const data = await graphql(`
    mutation($url: String!) {
      createTextFromUrl(url: $url) {
        id content summary language createdAt
        sources { id url title type }
        tags { id name value }
      }
    }
  `, { url: urlToExtract.value })

  if (data?.createTextFromUrl) {
    texts.value.unshift(data.createTextFromUrl)
    urlToExtract.value = ''
    showCreateDialog.value = false
    showSuccess('Text extracted and added successfully')
    fetchTags()
  }
  loading.value = false
}

function confirmDelete(text: any) {
  textToDelete.value = text
  showDeleteDialog.value = true
}

async function deleteText() {
  if (!textToDelete.value) return

  loading.value = true
  const data = await graphql(`
    mutation($id: ID!) {
      deleteText(id: $id)
    }
  `, { id: textToDelete.value.id })

  if (data?.deleteText) {
    texts.value = texts.value.filter((t: any) => t.id !== textToDelete.value.id)
    showDeleteDialog.value = false
    textToDelete.value = null
    showSuccess('Text deleted')
  }
  loading.value = false
}

function openDetail(text: any) {
  selectedText.value = text
  showDetailDialog.value = true
}

function openEdit(text: any) {
  selectedText.value = text
  editText.value = {
    id: text.id,
    content: text.content,
    summary: text.summary || '',
    language: text.language || 'et',
    tags: text.tags?.map((t: any) => ({ name: t.name, value: t.value })) || []
  }
  showEditDialog.value = true
}

async function updateText() {
  if (!editText.value.content.trim()) return

  loading.value = true
  const validTags = editText.value.tags.filter(t => t.name.trim()).map(t => ({
    name: t.name.trim(),
    value: t.value?.trim() || null
  }))

  const data = await graphql(`
    mutation($id: ID!, $content: String, $summary: String, $language: String, $tags: [TagInput!]) {
      updateText(id: $id, content: $content, summary: $summary, language: $language, tags: $tags) {
        id content summary language createdAt
        sources { id url title type }
        tags { id name value }
      }
    }
  `, {
    id: editText.value.id,
    content: editText.value.content,
    summary: editText.value.summary,
    language: editText.value.language,
    tags: validTags
  })

  if (data?.updateText) {
    const idx = texts.value.findIndex(t => t.id === data.updateText.id)
    if (idx !== -1) texts.value[idx] = data.updateText
    showEditDialog.value = false
    showSuccess('Text updated successfully')
    fetchTags()
  }
  loading.value = false
}

async function addInlineTag(text: any) {
  if (!inlineTag.value.name.trim()) return

  loading.value = true
  const data = await graphql(`
    mutation($targetId: ID!, $targetType: String!, $input: TagInput!) {
      addTag(targetId: $targetId, targetType: $targetType, input: $input) {
        id name value
      }
    }
  `, {
    targetId: text.id,
    targetType: 'TEXT',
    input: {
      name: inlineTag.value.name.trim(),
      value: inlineTag.value.value?.trim() || null
    }
  })

  if (data?.addTag) {
    if (!text.tags) text.tags = []
    text.tags.push(data.addTag)
    inlineTag.value = { name: '', value: '' }
    showSuccess('Tag added')
    fetchTags()
  }
  loading.value = false
}

async function removeTagInline(text: any, tag: any) {
  loading.value = true
  const data = await graphql(`
    mutation($tagId: ID!, $targetId: ID!, $targetType: String!) {
      removeTag(tagId: $tagId, targetId: $targetId, targetType: $targetType)
    }
  `, {
    tagId: tag.id,
    targetId: text.id,
    targetType: 'TEXT'
  })

  if (data?.removeTag) {
    text.tags = text.tags.filter((t: any) => t.id !== tag.id)
    showSuccess('Tag removed')
  }
  loading.value = false
}
</script>

<style scoped>
.whitespace-pre-wrap {
  white-space: pre-wrap;
}
.italic-content {
  font-style: italic;
  color: rgba(255, 255, 255, 0.7);
}
.preserved-text {
  line-height: 1.6;
  font-family: inherit;
}
</style>
 Riverside:
