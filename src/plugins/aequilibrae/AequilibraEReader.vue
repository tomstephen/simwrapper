<template lang="pug">
.c-aequilibrae-viewer.flex-col(:class="{'is-thumbnail': thumbnail}")
  b-input.search-box(
    type="search"
    icon-pack="fas"
    icon="search"
    placeholder="search tables..."
    v-model="searchTerm"
  )
  .viewer
    .database-content(v-if="isLoaded")
      p Database viewer - Tables will be listed here
      pre {{ viewData }}

</template>

<script lang="ts">
const i18n = {
  messages: {
    en: {},
    de: {},
  },
}

import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import debounce from 'debounce'

import globalStore from '@/store'
import AequilibraEFileSystem from '@/plugins/aequilibrae/AequilibraEFileSystem'

import { FileSystemConfig, UI_FONT, BG_COLOR_DASHBOARD } from '@/Globals'

import initSqlJs from 'sqlite3' // I dont think this method exists, good ol AI hallucination
import { Data } from 'vega'

type Database = any

const MyComponent = defineComponent({
  name: 'AequilibraEReader',
  i18n,
  props: {
    root: { type: String, required: true },
    subfolder: { type: String, required: true },
    config: { type: Object as any },
    resize: Object as any,
    thumbnail: Boolean,
    yamlConfig: String,
  },

  data() {
    return {
      globalState: globalStore.state,
      vizDetails: { title: '', description: '', file: '' },
      loadingText: '',
      id: `id-${Math.floor(1e12 * Math.random())}` as any,
      aeqFileSystem: new AequilibraEFileSystem(this.fileSystem, globalStore),
      sqlite3: null as any,
      db: null as any,
      databaseData: null as any,
      viewData: {} as any,
      searchTerm: '',
      debounceSearch: {} as any,
      isLoaded: false,
      isSearch: false,
    }
  },

  watch: {
    searchTerm() {
      this.debounceSearch()
    },
  },

  computed: {
    fileSystem(): FileSystemConfig {
      const svnProject: FileSystemConfig[] = this.$store.state.svnProjects.filter(
        (a: FileSystemConfig) => a.slug === this.root
      )
      if (svnProject.length === 0) {
        console.log('no such project')
        throw Error
      }
      return svnProject[0]
    },
  },

  async mounted() {
    // this.debounceSearch = debounce(this.handleSearch, 500)

    try {
      this.getVizDetails()
      // only continue if we are on a real page and not the file browser
      if (this.thumbnail) return

      const dbData = await this.fetchDatabase()

      this.databaseData = dbData
      this.viewData = this.databaseData
      this.isLoaded = true
    } catch (err) {
      const e = err as any
      console.error({ e })
      this.loadingText = '' + e
    }
  },

  methods: {
    getVizDetails() {
      if (this.config) {
        // config came in from the dashboard and is already parsed
        this.vizDetails = { ...this.config }
        this.vizDetails.file = `/${this.subfolder}/${this.config.file}`
        this.$emit('titles', this.vizDetails.title || this.vizDetails.file || 'AequilibraE Database')
      } else {
        // Otherwise this is a SQLite database file
        const filename = this.yamlConfig ?? ''
        this.vizDetails = {
          title: filename,
          description: '',
          file: this.subfolder + '/' + filename,
        }
      }
      this.$emit('titles', this.vizDetails.title || 'AequilibraE Database')
    },

    async initSqlJs() {
      if (this.sqlite3) return this.sqlite3
      this.sqlite3 = await initSqlJs({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`,
      })
      return this.sqlite3
    },

    async loadDatabase(filepath: string): Promise<Database> {
      const arrayBuffer = await this.aeqFileSystem.loadAequilibraEDatabase(filepath)
      const db = new this.sqlite3.Database(new Uint8Array(arrayBuffer))
      return db
    },

    getTableNames(db: Database): string[] {
      if (!db) throw new Error(`Database ${db} not found`)

      const res = db.exec("SELECT name FROM sqlite_master WHERE type='table';")

      return res.length > 0 ? res[0].values.flat() as string[] : []
    },

    gettableSchema(db: Database, tableName: string): { name: string; type: string; nullable: boolean }[] {
      if (!db) throw new Error(`Database ${db} not found`)

      const res = db.exec(`PRAGMA table_info(${tableName});`)

      return res.length > 0
        ? res[0].values.map((row: any[]) => ({
            name: row[1],
            type: row[2],
            nullable: row[3] === 0,
          }))
        : []
    },

    async readTable(db: Database, tableName: string): Promise<any[]> {
      if (!db) throw new Error(`Database ${db} not found`)

      const res = db.exec(`SELECT * FROM ${tableName};`)

      return res.length > 0 ? res[0].values : []
    },
  },
})

export default MyComponent
</script>

<style scoped lang="scss">
@import '@/styles.scss';

.c-aequilibrae-viewer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--bgCardFrame);
  padding: 0.25rem 0.5rem !important;
}

.viewer {
  height: 100%;
  width: 100%;
  flex: 1;
  margin: 0 auto;
  overflow: auto;
}

.viewer.is-thumbnail {
  padding: 0rem 0rem;
  margin: 0 0;
}

.database-content {
  width: 100%;
  padding: 0.25rem 0;
}
</style>

<style lang="scss">
.search-box {
  margin-bottom: 0.5rem;
}

.search-box input {
  background-color: var(--bgPanel);
  border: 1px solid var(--bgCream3);
  color: var(--link);
}
</style>
