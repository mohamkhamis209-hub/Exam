import { getYouTubeId } from "../utils/helpers.js";
import { saveEntity } from "./courseService.js";
import { validateYouTubeId } from "../utils/validation.js";
export async function saveLecture(id,data){
  const youtubeVideoId=validateYouTubeId(getYouTubeId(data.youtubeUrl)||data.youtubeVideoId||"");
  return saveEntity("lectures",id,{...data,youtubeVideoId});
}
