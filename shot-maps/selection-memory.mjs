// Independent of the DOM and chart type, for other studies to reuse.
export function createSelectionMemory(defaults){
  const previous=new Map();
  return {
    select(key,current,requested){
      const next=requested===current?(previous.get(key)??defaults[key]??current):requested;
      if(next!==current)previous.set(key,current);
      return next;
    },
    reset(){previous.clear();},
  };
}
