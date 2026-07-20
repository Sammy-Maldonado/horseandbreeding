<template>
  <div style="line-height: 80%">
    <slot></slot>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { asBlob } from "html-docx-js-typescript";
// import { saveAs } from "file-saver";
import fileSaver from "file-saver";
const { saveAs } = fileSaver;
// Conversion from centimeters to points (1 cm ≈ 28.35 points)
// const downloadFile = () => {
//   const blob = new Blob(["Hello, world!"], { type: "text/plain;charset=utf-8" });
//   saveAs(blob, "hello world.txt");
// };
const htmlContent = ref(`
  <html>
    <head>
		<meta charset="utf-8">
      <style scoped>
        body {
          font-family: 'Arial', sans-serif; 
          font-size: 8pt;  
          line-height: 80%;
        }  
 
       </style>
    </head>
    <body class="body">
      data1
    </body>
  </html>
`);

const generateDocx = async () => {
  const element = document.getElementById("report-docx");
  // If you want the outer HTML (including the element itself)
  const HtmlString = element.outerHTML;
  const options = {
    margin: {
      top: 50, // 0.75 cm in points
      left: 150, // 1.5 cm in points
      right: 155, // 1.55 cm in points
    },
    orientation: "portrait", // 'portrait' or 'landscape'
    pageSize: "A4", // Changed to A5
    title: "My Document Title",
    author: "Author Name",
    subject: "Document Subject",
    keywords: "keyword1, keyword2",
    header: "<p>Header content here</p>", // Simple HTML for header
    lineSpacing: 0.5,
    footer:
      "<p>Page <span style='page-number'></span> of <span style='total-pages'></span></p>", // Simple HTML for footer
    fileName: "custom-report.docx", // Default file name
  };
  try {
    // Convert HTML content to .docx Blob with options
    const docxBlob = await asBlob(
      htmlContent.value.replace("data1", HtmlString),
      options
    );

    // Save the Blob as a .docx file
    saveAs(docxBlob, options.fileName);
  } catch (error) {
    console.error("Error generating .docx file:", error);
  }
};

defineExpose({
  generateDocx,
});
</script>
