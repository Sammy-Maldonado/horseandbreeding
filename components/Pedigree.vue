<template>
  <table
    style="
      border: 1px solid black;
      border-style: dotted;
      width: 100%;
      padding: 0;
      margin: 0;
    "
    v-if="pedigrees.length > 0"
  >
    <tbody>
      <tr>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;
            font-weight: 700;
            border-right: 1px solid black; ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.has_disciplines[0]?.disciplines?.group_priority
            )}`"
          rowspan="8"
        >
          {{ convertUpCase(pedigrees[0]?.name) }}
        </td>

        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;
            border-right: 1px solid black; ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.sire?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="4"
        >
          {{ convertUpCase(pedigrees[0]?.sire?.name) }}
        </td>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;
            border-right: 1px solid black; ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.sire?.sire?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="2"
        >
          {{ convertUpCase(pedigrees[0]?.sire?.sire?.name) }}
        </td>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;  ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.sire?.sire?.sire?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="1"
        >
          {{ convertUpCase(pedigrees[0]?.sire?.sire?.sire?.name) }}
        </td>
      </tr>
      <tr>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;  ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.sire?.sire?.dam?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="1"
        >
          {{ convertUpCase(pedigrees[0]?.sire?.sire?.dam?.name) }}
        </td>
      </tr>

      <tr>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;
            border-right: 1px solid black; ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.sire?.dam?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="2"
        >
          {{ convertUpCase(pedigrees[0]?.sire?.dam?.name) }}
        </td>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;  ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.sire?.dam?.sire?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="1"
        >
          {{ convertUpCase(pedigrees[0]?.sire?.dam?.sire?.name) }}
        </td>
      </tr>

      <tr>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;  ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.sire?.dam?.dam?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="1"
        >
          {{ convertUpCase(pedigrees[0]?.sire?.dam?.dam?.name) }}
        </td>
      </tr>

      <tr>
        <td
          :style="`
            padding: 0;
            margin: 0;
            border-right: 1px solid black;
            border-right: 1px solid black;
          ${addUpperCaseFontBoldStyle(
            pedigrees[0]?.dam?.has_disciplines[0]?.disciplines?.group_priority
          )}`"
          rowspan="4"
        >
          {{ convertUpCase(pedigrees[0]?.dam?.name) }}
        </td>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;
            border-right: 1px solid black; ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.dam?.sire?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="2"
        >
          {{ convertUpCase(pedigrees[0]?.dam?.sire?.name) }}
        </td>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;  ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.dam?.sire?.sire?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="1"
        >
          {{ convertUpCase(pedigrees[0]?.dam?.sire?.sire?.name) }}
        </td>
      </tr>

      <tr>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;  ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.dam?.sire?.dam?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="1"
        >
          {{ convertUpCase(pedigrees[0]?.dam?.sire?.dam?.name) }}
        </td>
      </tr>

      <tr>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;
            border-right: 1px solid black; ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.dam?.dam?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="2"
        >
          {{ convertUpCase(pedigrees[0]?.dam?.dam?.name) }}
        </td>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;  ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.dam?.dam?.sire?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="1"
        >
          {{ convertUpCase(pedigrees[0]?.dam?.dam?.sire?.name) }}
        </td>
      </tr>

      <tr>
        <td
          :style="`
            padding: 0;
            margin: 0;
            padding-left: 2px;  ${addUpperCaseFontBoldStyle(
              pedigrees[0]?.dam?.dam?.dam?.has_disciplines[0]?.disciplines
                ?.group_priority
            )}`"
          rowspan="1"
        >
          {{ convertUpCase(pedigrees[0]?.dam?.dam?.dam?.name) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { convertUpCase, addUpperCaseFontBoldStyle } from "/assets/js/functions";

const props = defineProps({
  pedigrees: { type: Object, default: null },
});
</script>