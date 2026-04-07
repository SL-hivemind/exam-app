import React,{useState,useEffect} from 'react';
import {Box,Typography,TextField,MenuItem,Stack,Divider,IconButton,Autocomplete} from '@mui/material';
import {FilterList as FilterIcon,RestartAlt as ResetIcon,Search as SearchIcon} from '@mui/icons-material';
import api from '../../utils/api';

export default function FilterSidebar({filters,onFilterChange,onReset}){
const [metadata,setMetadata]=useState({subjects:[],classes:[],chapters:[],topics:[]});

useEffect(()=>{
const fetchMetadata=async()=>{
try{
// Build cascading query params so chapters/topics reflect selected class/subject
const params=new URLSearchParams();
if(filters.class_number) params.set('class_number',filters.class_number);
if(filters.subject) params.set('subject',filters.subject);
if(filters.chapter) params.set('chapter',filters.chapter);
const res=await api.get(`/api/metadata/repository?${params}`);
setMetadata(res.data);
}catch(err){console.error('Failed to fetch filter metadata',err);}
};
fetchMetadata();
},[filters.class_number,filters.subject,filters.chapter]);

const handleChange=(name,value)=>{
const next={...filters,[name]:value};
// Cascade: clear child filters when parent changes
if(name==='class_number'||name==='subject'){
next.chapter='';
next.topic='';
}
if(name==='chapter'){
next.topic='';
}
onFilterChange(next);
};

return(
<Box sx={{width:280,height:'100%',borderRight:'1px solid #e0e0e0',bgcolor:'#fff',display:'flex',flexDirection:'column'}}>
<Box sx={{p:2,display:'flex',alignItems:'center',justifyContent:'space-between',bgcolor:'#f8f9fa'}}>
<Stack direction="row" spacing={1} alignItems="center">
<FilterIcon color="primary" fontSize="small"/>
<Typography variant="subtitle1" fontWeight={700}>Filters</Typography>
</Stack>
<IconButton size="small" onClick={onReset} title="Reset All"><ResetIcon fontSize="small"/></IconButton>
</Box>

<Divider/>

<Box sx={{p:2,overflowY:'auto',flexGrow:1}}>
<Stack spacing={3}>

<TextField
placeholder="Search by text or ID (e.g. 10-SCI)..."
fullWidth
size="small"
value={filters.search||''}
onChange={e=>handleChange('search',e.target.value)}
InputProps={{startAdornment:(<SearchIcon fontSize="small" sx={{mr:1,color:'text.secondary'}}/>)}}/>

<Box>
<Typography variant="caption" fontWeight={800} color="text.secondary" sx={{mb:1,display:'block',textTransform:'uppercase'}}>Academic Scope</Typography>

<TextField
select
fullWidth
size="small"
label="Select Class"
value={filters.class_number||''}
onChange={e=>handleChange('class_number',e.target.value)}
sx={{mb:2}}>
<MenuItem value="">All Classes</MenuItem>
{metadata.classes.map(c=><MenuItem key={c} value={c}>Class {c}</MenuItem>)}
</TextField>

<TextField
select
fullWidth
size="small"
label="Select Subject"
value={filters.subject||''}
onChange={e=>handleChange('subject',e.target.value)}>
<MenuItem value="">All Subjects</MenuItem>
{metadata.subjects.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
</TextField>
</Box>

<Divider/>

<Box>
<Typography variant="caption" fontWeight={800} color="text.secondary" sx={{mb:1,display:'block',textTransform:'uppercase'}}>Content Drilldown</Typography>

<Autocomplete
size="small"
options={metadata.chapters}
value={filters.chapter||null}
onChange={(e,val)=>handleChange('chapter',val)}
renderInput={params=><TextField {...params} label="Chapter" margin="dense"/>}
sx={{mb:1}}/>

<Autocomplete
size="small"
options={metadata.topics}
value={filters.topic||null}
onChange={(e,val)=>handleChange('topic',val)}
renderInput={params=><TextField {...params} label="Topic" margin="dense"/>}/>
</Box>

</Stack>
</Box>
</Box>
);
}
