import React,{useState,useEffect,useRef} from 'react';
import {Box,Typography,TextField,MenuItem,Stack,Divider,IconButton,Autocomplete,Paper,useMediaQuery,useTheme,InputAdornment} from '@mui/material';
import {FilterList as FilterIcon,RestartAlt as ResetIcon,Search as SearchIcon,Class as ClassIcon,Subject as SubjectIcon,MenuBook as MenuBookIcon,Topic as TopicIcon} from '@mui/icons-material';
import api from '../../utils/api';

export default function FilterSidebar({filters,onFilterChange,onReset}){
const [metadata,setMetadata]=useState({subjects:[],classes:[],chapters:[],topics:[]});
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));

// Track previous cascading keys to only clear children on genuine user-driven changes
const prevCascadeRef=useRef({class_number:filters.class_number,subject:filters.subject,chapter:filters.chapter});

useEffect(()=>{
const fetchMetadata=async()=>{
try{
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
const next={...filters,[name]:value||''};

// Only cascade-clear children when the user explicitly changes a PARENT filter
// (not when Autocomplete fires null because options list changed)
const prev=prevCascadeRef.current;
if(name==='class_number'||name==='subject'){
  if(prev[name]!==next[name]){
    next.chapter='';
    next.topic='';
  }
}
if(name==='chapter'){
  if(prev.chapter!==next.chapter){
    next.topic='';
  }
}

prevCascadeRef.current={class_number:next.class_number,subject:next.subject,chapter:next.chapter};
onFilterChange(next);
};

if (isMobile) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.02)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#f5f8ff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon sx={{ color: '#ffb054', fontSize: 18 }} /> Filters
        </Typography>
        <IconButton size="small" onClick={onReset} title="Reset All" sx={{ color: '#aab4dd' }}><ResetIcon fontSize="small" /></IconButton>
      </Box>
      <Box
        sx={{
          display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto',
          pb: 0.5, '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
        }}
      >
        <TextField
          size="small" placeholder="Search..." value={filters.search||''} onChange={e=>handleChange('search',e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 150 }}
        />
        <TextField
          select size="small" label="Class" value={filters.class_number||''} onChange={e=>handleChange('class_number',e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><ClassIcon color="action" fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">All</MenuItem>
          {metadata.classes.map(c=><MenuItem key={c} value={c}>Class {c}</MenuItem>)}
        </TextField>
        <TextField
          select size="small" label="Subject" value={filters.subject||''} onChange={e=>handleChange('subject',e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SubjectIcon color="action" fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          {metadata.subjects.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <Autocomplete
          size="small" freeSolo options={metadata.chapters} value={filters.chapter||null} onChange={(e,val)=>handleChange('chapter',val)}
          sx={{ minWidth: 160 }}
          renderInput={params=>(
            <TextField {...params} label="Chapter" InputProps={{ ...params.InputProps, startAdornment: (<><InputAdornment position="start"><MenuBookIcon color="action" fontSize="small" /></InputAdornment>{params.InputProps.startAdornment}</>) }} />
          )}
        />
        <Autocomplete
          size="small" freeSolo options={metadata.topics} value={filters.topic||null} onChange={(e,val)=>handleChange('topic',val)}
          sx={{ minWidth: 160 }}
          renderInput={params=>(
            <TextField {...params} label="Topic" InputProps={{ ...params.InputProps, startAdornment: (<><InputAdornment position="start"><TopicIcon color="action" fontSize="small" /></InputAdornment>{params.InputProps.startAdornment}</>) }} />
          )}
        />
      </Box>
    </Paper>
  );
}

return(
<Box sx={{width:280,height:'100%',borderRadius:'18px',border:'1px solid rgba(255,255,255,0.10)',bgcolor:'rgba(255,255,255,0.04)',backdropFilter:'blur(16px)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 12px 40px rgba(2,6,23,0.5)',flexShrink:0}}>
<Box sx={{p:2,display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(135deg, rgba(47,107,255,0.16), rgba(246,137,20,0.14))',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
<Stack direction="row" spacing={1} alignItems="center">
<FilterIcon sx={{color:'#ffb054'}} fontSize="small"/>
<Typography variant="subtitle1" fontWeight={700} sx={{color:'#f5f8ff'}}>Filters</Typography>
</Stack>
<IconButton size="small" onClick={onReset} title="Reset All" sx={{color:'#aab4dd'}}><ResetIcon fontSize="small"/></IconButton>
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
freeSolo
options={metadata.chapters}
value={filters.chapter||null}
onChange={(e,val)=>handleChange('chapter',val)}
renderInput={params=><TextField {...params} label="Chapter" margin="dense"/>}
sx={{mb:1}}/>

<Autocomplete
size="small"
freeSolo
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
