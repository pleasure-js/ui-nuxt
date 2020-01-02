<template>
  <pleasure
    :entity="entity"
    :entry-id="entry"
    :value="value"
    method="update"
    :autoload="false"
    :key="id"
  ></pleasure>
</template>
<script>
  import { ApiClient } from '@pleasure-js/api-client'
  const ApiClient = ApiClient.instance()

  export default {
    async asyncData ({ route: { params: { entity, entry } } }) {
      return {
        value: await ApiClient.read(entity, entry),
        entity,
        entry
      }
    },
    computed: {
      id () {
        return `${ this.entity }-${ this.entry }`
      }
    }
  }
</script>
