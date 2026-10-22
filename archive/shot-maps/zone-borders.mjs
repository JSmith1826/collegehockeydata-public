// Shared by the live maps and their current-view PNG exports.
export function zoneBorderStyle({view,theme,zoneBorders=false},selected=false) {
  if(selected)return {stroke:view==='heatmap'?(theme==='dark'?'#e3f37e':'#18453b'):'#b36914',width:3};
  if(view==='heatmap')return zoneBorders?{stroke:theme==='dark'?'#9fbfb2':'#527263',width:1.3}:{stroke:'transparent',width:0};
  return view==='attempts'?{stroke:'transparent',width:0}:{stroke:'#527263',width:1.3};
}
