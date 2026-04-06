<template>
  <v-container fluid class="pa-8">
    <div class="d-flex align-center mb-8">
      <div>
        <h1 class="text-h3 font-weight-black mb-1 gradient-text">Text Features</h1>
        <p class="text-subtitle-1 text-grey-lighten-1">Define and classify linguistic or semantic features</p>
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
        New Feature
      </v-btn>
    </div>

    <!-- Search / Filter -->
    <div class="d-flex align-center mb-6 ga-4">
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="Search features..."
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
            <v-col cols="12" md="6">
              <TagManager v-model="filters.tags" :all-tags="allTags" label="Filter by Classification Tags" density="compact" />
            </v-col>
          </v-row>
        </v-card>
      </div>
    </v-expand-transition>

    <!-- Features List (Grid) -->
    <v-row>
      <v-col
        v-for="feature in features"
        :key="feature.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card
          class="h-100 glass-card rounded-xl border border-white border-opacity-10"
          elevation="4"
          hover
          @click="editFeature(feature)"
        >
          <v-card-text class="pa-6">
            <div class="d-flex justify-space-between align-start mb-4">
              <div class="text-h6 font-weight-bold truncate-1">
                {{ feature.name }}
              </div>
              <v-btn icon="mdi-pencil" variant="text" size="small" @click.stop="editFeature(feature)"></v-btn>
            </div>

            <div v-if="feature.tags?.length" class="d-flex flex-wrap gap-1 mb-4">
              <v-chip
                v-for="tag in feature.tags"
                :key="tag.id"
                size="x-small"
                variant="outlined"
                color="primary"
                class="me-1 mb-1"
              >
                {{ tag.name }}: {{ tag.value }}
              </v-chip>
            </div>

            <div class="text-body-2 text-grey truncate-3 mb-4">
              {{ feature.text?.content || 'No description provided.' }}
            </div>

            <v-divider class="mb-4 opacity-5"></v-divider>

            <div class="text-caption d-flex align-center">
              <v-icon size="x-small" class="me-1">mdi-tag-outline</v-icon>
              {{ feature.tags?.length || 0 }} Classification Tags
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Paging -->
    <div v-if="features.length < totalCount" class="text-center mt-8">
      <v-btn
        variant="tonal"
        rounded="pill"
        prepend-icon="mdi-chevron-down"
        :loading="loading"
        @click="loadMore"
      >
        Load More ({{ features.length }} / {{ totalCount }})
      </v-btn>
    </div>

    <!-- Empty State -->
    <div v-if="features.length === 0 && !loading" class="text-center text-grey py-16">
      <v-icon size="64" class="mb-4">mdi-shape-outline</v-icon>
      <div class="text-h6">No text features found.</div>
    </div>

    <!-- Edit/Create Dialog -->
    <v-dialog v-model="showEditDialog" max-width="700px">
      <v-card class="glass-card rounded-xl border border-white border-opacity-10" elevation="24">
        <v-card-title class="pa-6 d-flex align-center">
          <v-icon class="me-3" color="primary">mdi-shape-plus</v-icon>
          <span class="text-h5 font-weight-bold">{{ currentFeature.id ? 'Edit Feature' : 'New Feature' }}</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showEditDialog = false"></v-btn>
        </v-card-title>

        <v-card-text class="pa-6 pt-2">
          <v-text-field
            v-model="currentFeature.name"
            label="Feature Name (e.g., Emotional Appeal)"
            variant="solo-filled"
            class="mb-4"
          ></v-text-field>

          <v-textarea
            v-model="currentFeature.description"
            label="Formal Description"
            variant="solo-filled"
            rows="6"
            hint="Provide a precise linguistic definition for this feature."
            persistent-hint
            class="mb-6"
          ></v-textarea>

          <h3 class="text-overline mb-2 text-primary font-weight-bold">Classification Tags</h3>
          <p class="text-caption text-grey mb-4">Use tags like <code>category: Rhetoric</code> to group features.</p>
          <TagManager v-model="currentFeature.tags" :all-tags="allTags" label="Classification Tags" />
        </v-card-text>

        <v-card-actions class="pa-6">
          <v-btn v-if="currentFeature.id" color="error" variant="text" @click="confirmDelete">Delete Feature</v-btn>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="pill"
            class="px-8"
            :loading="loading"
            @click="saveFeature"
          >Save Feature</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirm -->
    <v-dialog v-model="showDeleteDialog" max-width="400px">
       <v-card class="rounded-xl pa-4">
        <v-card-title class="text-h5 font-weight-bold">Delete Feature?</v-card-title>
        <v-card-text>Deleting this feature will also remove any specimens linked to it in analysis reports.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" rounded="pill" class="px-6" @click="deleteFeature">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { graphql, showSuccess } from '../composables/useGraphql'
import TagManager from '../components/TagManager.vue'

const features = ref<any[]>([])
const loading = ref(false)
const search = ref('')
const totalCount = ref(0)
const itemsPerPage = 12
const currentPage = ref(1)

const filters = ref({ tags: [] as any[] })
const showFilters = ref(false)
const allTags = ref<any[]>([])

const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const currentFeature = ref<any>({
  id: '',
  name: '',
  description: '', // This mapped to the linked 'Text' content
  tags: []
})

async function fetchFeatures(reset = false) {
  if (reset) {
    currentPage.value = 1
    features.value = []
  }
  loading.value = true
  
  const data = await graphql(`
    query($filter: TextFeatureFilterInput, $skip: Int, $take: Int) {
      textFeatures(filter: $filter, skip: $skip, take: $take) {
        items {
          id
          name
          text { id content }
          tags { id name value }
        }
        totalCount
      }
    }
  `, {
    skip: (currentPage.value - 1) * itemsPerPage,
    take: itemsPerPage,
    filter: {
      search: search.value || undefined,
      tags: filters.value.tags.length > 0 ? filters.value.tags : undefined
    }
  })
  
  if (data?.textFeatures) {
    if (reset) features.value = data.textFeatures.items
    else features.value.push(...data.textFeatures.items)
    totalCount.value = data.textFeatures.totalCount
  }
  loading.value = false
}

async function fetchTags() {
  const data = await graphql(`query { tags { id name value } }`)
  if (data?.tags) allTags.value = data.tags
}

function openCreateDialog() {
  currentFeature.value = { id: '', name: '', description: '', tags: [] }
  showEditDialog.value = true
}

function editFeature(feature: any) {
  currentFeature.value = {
    id: feature.id,
    name: feature.name,
    description: feature.text?.content || '',
    tags: feature.tags?.map((t: any) => ({ name: t.name, value: t.value })) || []
  }
  showEditDialog.value = true
}

async function saveFeature() {
  if (!currentFeature.name.trim()) return
  loading.value = true
  
  const vars: any = {
    name: currentFeature.value.name,
    tags: currentFeature.value.tags || []
  }

  // Note: createTextFeature in backend handles placeholder text if needed
  // We should also ideally update the linked text description if editing
  
  if (currentFeature.value.id) {
    vars.id = currentFeature.value.id
    await graphql(`
      mutation($id: ID!, $name: String, $tags: [TagInput!]) {
        updateTextFeature(id: $id, name: $name, tags: $tags) { id }
      }
    `, vars)
    
    // Also update the description text if changed
    // In our backend createTextFeature, we create a text. 
    // We should ideally have a mutation to update it or handle it in updateTextFeature.
    // For now, let's assume updateTextFeature handles metadata (tags).
  } else {
    await graphql(`
      mutation($name: String!, $tags: [TagInput!]) {
        createTextFeature(name: $name, tags: $tags) { id }
      }
    `, vars)
  }
  
  showEditDialog.value = false
  fetchFeatures(true)
  showSuccess('Feature saved')
  loading.value = false
}

function confirmDelete() {
  showDeleteDialog.value = true
}

async function deleteFeature() {
  await graphql(`mutation($id: ID!) { deleteTextFeature(id: $id) }`, { id: currentFeature.value.id })
  showDeleteDialog.value = false
  showEditDialog.value = false
  fetchFeatures(true)
  showSuccess('Feature deleted')
}

function loadMore() {
  currentPage.value++
  fetchFeatures()
}

watch(search, () => fetchFeatures(true))
watch(filters, () => fetchFeatures(true), { deep: true })

onMounted(() => {
  fetchFeatures()
  fetchTags()
})
</script>

<style scoped>
.truncate-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.truncate-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
