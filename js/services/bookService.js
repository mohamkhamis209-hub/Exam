import { saveEntity } from "./courseService.js";
export const saveBook=(id,data)=>saveEntity("books",id,data);
