/**
 * `resources` modülü dışa açık API'si (Faz 7). İstemci bileşenleri bu dosyayı import etmez
 * (sunucu dosyaları da dışa açılır). Planner ve analytics kaynak verisini görünümlerden okur,
 * bu modülü import etmez (11 §0).
 */
export { resourcesModule } from "./module";
export { resourcesWidgets } from "./widgets";
export { ResourceForm } from "./components/resource-form";
export { SectionEditor } from "./components/section-editor";
export { ResourceCatalog } from "./components/resource-catalog";
export { AssignResourceButton } from "./components/assign-button";
export { ResourceActions, AssignedStudents } from "./components/resource-actions";
export { StudentResourceList } from "./components/student-resource-list";
export { StudentResourceDetail } from "./components/student-resource-detail";
export { ResourceProgressTable } from "./components/resource-progress-table";
export {
  listCatalog,
  listCatalogTitles,
  getResourceOptions,
  listResourceTemplates,
  getStudentTemplateId,
  getResource,
  listStudentsForAssign,
  listStudentResources,
  listStudentSections,
  getStudentResource,
} from "./server/queries";
export {
  createResource,
  updateResource,
  deleteResource,
  keepInCatalog,
  addSections,
  updateSection,
  deleteSection,
  moveSection,
  setSectionTopics,
  assignResource,
  unassignResource,
  selfAssignResource,
} from "./server/actions";
export {
  createResourceSchema,
  resourceFormSchema,
  updateResourceSchema,
  sectionBatchSchema,
  type CreateResourceInput,
  type ResourceFormInput,
  type SectionBatchInput,
} from "./schemas";
export type {
  CatalogRow,
  CatalogTitle,
  ResourceDetail,
  ResourceOptions,
  ResourceSection,
  ResourceSubjectOption,
  SectionRow,
  StudentResourceDetail as StudentResourceDetailData,
  StudentResourceRow,
} from "./types";
