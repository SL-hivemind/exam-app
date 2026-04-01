import React,{useEffect,useState} from 'react';
import {useParams,useNavigate} from 'react-router-dom';
import {Box,Typography,Button,Paper,Stack,IconButton,Dialog,DialogTitle,DialogContent,DialogActions,TextField,Grid,Chip,CircularProgress} from '@mui/material';
import {Delete as DeleteIcon,CloudUpload as CloudUploadIcon,Add as AddIcon,ArrowBack as ArrowBackIcon,LibraryAdd as RepoIcon,Image as ImageIcon,Edit as EditIcon,Flag as FlagIcon} from '@mui/icons-material';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

export default function AdminExamQuestions(){
const {examId}=useParams();
const navigate=useNavigate();
const {user}=useAuth();
const [questions,setQuestions]=useState([]);
const [loading,setLoading]=useState(false);
const [uploadingImg,setUploadingImg]=useState(false);
const [openDialog,setOpenDialog]=useState(false);
const [newQ,setNewQ]=useState({text:'',option_a:'',option_b:'',option_c:'',option_d:'',correct_answer:'',marks:1,image_path:''});
const [editDialog,setEditDialog]=useState(false);
const [editingQ,setEditingQ]=useState(null);
const [reportDialog,setReportDialog]=useState(false);
const [reportQId,setReportQId]=useState(null);
const [reportMsg,setReportMsg]=useState('');

const getBasePath=()=>user?.role==='school_admin'?'/school':'/admin';
const basePath=getBasePath();

useEffect(()=>{fetchQuestions();},[examId]);

const fetchQuestions=async()=>{
try{
setLoading(true);
const res=await api.get(`/admin/exams/${examId}/questions`);
setQuestions(res.data.questions||[]);
}catch(err){console.error(err);}
finally{setLoading(false);}
};

const handleImageUpload=async(e)=>{
const file=e.target.files[0];
if(!file)return;
setUploadingImg(true);
const formData=new FormData();
formData.append('file',file);
try{
const res=await api.post('/admin/upload/image',formData,{headers:{'Content-Type':'multipart/form-data'}});
setNewQ(prev=>({...prev,image_path:res.data.url}));
}catch(err){alert('Image upload failed');}
finally{setUploadingImg(false);}
};

const handleAddManual=async()=>{
try{
await api.post(`/admin/exams/${examId}/questions`,newQ);
setOpenDialog(false);
setNewQ({text:'',option_a:'',option_b:'',option_c:'',option_d:'',correct_answer:'',marks:1,image_path:''});
fetchQuestions();
}catch(err){alert('Failed to add question');}
};

const handleCsvUpload=async(e)=>{
const file=e.target.files[0];
if(!file)return;
const formData=new FormData();
formData.append('file',file);
try{
setLoading(true);
const res=await api.post(`/admin/exams/${examId}/questions`,formData,{headers:{'Content-Type':'multipart/form-data'}});
alert(res.data.message);
fetchQuestions();
}catch(err){alert(err.response?.data?.message||'Upload failed');}
finally{setLoading(false);e.target.value=null;}
};

const handleDelete=async(id)=>{
if(!window.confirm('Remove question from exam?'))return;
try{
await api.delete(`/admin/exams/${examId}/questions/${id}`);
fetchQuestions();
}catch(err){alert('Delete failed');}
};

const handleEditSubmit=async()=>{
try{
await api.put(`/admin/exams/${examId}/questions/${editingQ.id}`,editingQ);
setEditDialog(false);
fetchQuestions();
}catch(err){alert('Edit failed');}
};

const handleReportSubmit=async()=>{
try{
await api.post(`/admin/repository/questions/${reportQId}/report`,{message:reportMsg});
setReportDialog(false);
setReportMsg('');
alert('Question reported successfully');
}catch(err){alert('Report failed');}
};

return(
<Box sx={{p:3,bgcolor:'#f5f7fa',minHeight:'100vh'}}>
<Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" alignItems="center" mb={4} spacing={2}>
<Box>
<Button startIcon={<ArrowBackIcon/>} onClick={()=>navigate(-1)} sx={{mb:1}}>Back</Button>
<Typography variant="h4" fontWeight={700} color="primary.main">Exam Questions</Typography>
<Typography variant="body2" color="text.secondary">Managing content for Exam #{examId}</Typography>
</Box>
<Stack direction="row" spacing={2}>
<Button variant="outlined" component="label" startIcon={<CloudUploadIcon/>}>Upload CSV<input type="file" hidden accept=".csv" onChange={handleCsvUpload}/></Button>
<Button variant="contained" color="secondary" startIcon={<RepoIcon/>} onClick={()=>navigate(`${basePath}/repository/questions?examId=${examId}`)}>Pick from Repo</Button>
<Button variant="contained" startIcon={<AddIcon/>} onClick={()=>setOpenDialog(true)}>Add Question</Button>
</Stack>
</Stack>

{loading&&<Box display="flex" justifyContent="center" py={4}><CircularProgress/></Box>}

<Stack spacing={2}>
{questions.map((q,index)=>(
<Paper key={q.id} elevation={1} sx={{p:2,borderRadius:2,position:'relative'}}>
<Box display="flex" alignItems="flex-start" justifyContent="space-between">
<Box>
<Typography variant="subtitle1" fontWeight={600} gutterBottom><Box component="span" color="primary.main" mr={1}>Q{index+1}.</Box>{q.text}</Typography>
{q.image_path&&<Box sx={{my:1}}><img src={q.image_path} alt="Q" style={{maxHeight:100,borderRadius:4}}/></Box>}
<Grid container spacing={2}>
<Grid item xs={6} md={3}><Typography variant="body2">A) {q.option_a}</Typography></Grid>
<Grid item xs={6} md={3}><Typography variant="body2">B) {q.option_b}</Typography></Grid>
<Grid item xs={6} md={3}><Typography variant="body2">C) {q.option_c}</Typography></Grid>
<Grid item xs={6} md={3}><Typography variant="body2">D) {q.option_d}</Typography></Grid>
</Grid>
<Stack direction="row" mt={2} alignItems="center">
<Box>
<Chip label={`Answer: ${q.correct_answer}`} size="small" color="success" variant="outlined" sx={{mr:1}}/>
<Chip label={`Marks: ${q.marks}`} size="small" sx={{mr:1}}/>
{q.is_global&&<Chip label="Repo Item" size="small" color="secondary" variant="outlined"/>}
</Box>
</Stack>
</Box>
<Stack direction="row" spacing={1} sx={{mt:-1,mr:-1}}>
{q.is_global&&<IconButton color="warning" onClick={()=>{setReportQId(q.repo_question_id);setReportDialog(true);}}><FlagIcon/></IconButton>}
<IconButton color="primary" onClick={()=>{setEditingQ({...q});setEditDialog(true);}}><EditIcon/></IconButton>
<IconButton color="error" onClick={()=>handleDelete(q.id)}><DeleteIcon/></IconButton>
</Stack>
</Box>
</Paper>
))}
</Stack>

<Dialog open={openDialog} onClose={()=>setOpenDialog(false)} fullWidth maxWidth="md">
<DialogTitle>Add Question Manually</DialogTitle>
<DialogContent dividers>
<Box mb={3}>
<Stack direction="row" spacing={2} alignItems="center">
<Button component="label" variant="outlined" startIcon={uploadingImg?<CircularProgress size={20}/>:<ImageIcon/>} disabled={uploadingImg}>
Upload Image<input type="file" hidden accept="image/*" onChange={handleImageUpload}/>
</Button>
{newQ.image_path&&<Chip label="Image Uploaded" color="success" onDelete={()=>setNewQ({...newQ,image_path:''})}/>}
</Stack>
{newQ.image_path&&<Box mt={2}><img src={newQ.image_path} alt="Preview" style={{maxHeight:150,borderRadius:8,border:'1px solid #ccc'}}/></Box>}
</Box>

<TextField fullWidth margin="dense" label="Question Text" multiline rows={3} value={newQ.text} onChange={e=>setNewQ({...newQ,text:e.target.value})}/>
<Grid container spacing={2} sx={{mt:1}}>
<Grid item xs={6}><TextField fullWidth label="Option A" value={newQ.option_a} onChange={e=>setNewQ({...newQ,option_a:e.target.value})}/></Grid>
<Grid item xs={6}><TextField fullWidth label="Option B" value={newQ.option_b} onChange={e=>setNewQ({...newQ,option_b:e.target.value})}/></Grid>
<Grid item xs={6}><TextField fullWidth label="Option C" value={newQ.option_c} onChange={e=>setNewQ({...newQ,option_c:e.target.value})}/></Grid>
<Grid item xs={6}><TextField fullWidth label="Option D" value={newQ.option_d} onChange={e=>setNewQ({...newQ,option_d:e.target.value})}/></Grid>
<Grid item xs={6}><TextField fullWidth label="Correct Answer" helperText="e.g. A, B, C, D" value={newQ.correct_answer} onChange={e=>setNewQ({...newQ,correct_answer:e.target.value})}/></Grid>
<Grid item xs={6}><TextField fullWidth label="Marks" type="number" value={newQ.marks} onChange={e=>setNewQ({...newQ,marks:e.target.value})}/></Grid>
</Grid>
</DialogContent>
<DialogActions sx={{p:2}}>
<Button onClick={()=>setOpenDialog(false)}>Cancel</Button>
<Button variant="contained" onClick={handleAddManual}>Save Question</Button>
</DialogActions>
</Dialog>

<Dialog open={editDialog} onClose={()=>setEditDialog(false)} fullWidth maxWidth="md">
<DialogTitle>{editingQ?.is_global?'Override Marks (Repo Linked)':'Edit Question'}</DialogTitle>
<DialogContent dividers>
{editingQ?.is_global?(
<Box>
<Typography variant="body2" color="warning.main" gutterBottom>This is a Global Repository Question. You can only override the marks in your exam.</Typography>
<Typography variant="body1" sx={{mb:2}}>{editingQ.text}</Typography>
<TextField fullWidth label="Marks" type="number" value={editingQ?.marks||1} onChange={e=>setEditingQ({...editingQ,marks:e.target.value})}/>
</Box>
):(
<Box>
<TextField fullWidth margin="dense" label="Question Text" multiline rows={3} value={editingQ?.text||''} onChange={e=>setEditingQ({...editingQ,text:e.target.value})}/>
<Grid container spacing={2} sx={{mt:1}}>
<Grid item xs={6}><TextField fullWidth label="Option A" value={editingQ?.option_a||''} onChange={e=>setEditingQ({...editingQ,option_a:e.target.value})}/></Grid>
<Grid item xs={6}><TextField fullWidth label="Option B" value={editingQ?.option_b||''} onChange={e=>setEditingQ({...editingQ,option_b:e.target.value})}/></Grid>
<Grid item xs={6}><TextField fullWidth label="Option C" value={editingQ?.option_c||''} onChange={e=>setEditingQ({...editingQ,option_c:e.target.value})}/></Grid>
<Grid item xs={6}><TextField fullWidth label="Option D" value={editingQ?.option_d||''} onChange={e=>setEditingQ({...editingQ,option_d:e.target.value})}/></Grid>
<Grid item xs={6}><TextField fullWidth label="Correct Answer" value={editingQ?.correct_answer||''} onChange={e=>setEditingQ({...editingQ,correct_answer:e.target.value})}/></Grid>
<Grid item xs={6}><TextField fullWidth label="Marks" type="number" value={editingQ?.marks||1} onChange={e=>setEditingQ({...editingQ,marks:e.target.value})}/></Grid>
</Grid>
</Box>
)}
</DialogContent>
<DialogActions sx={{p:2}}>
<Button onClick={()=>setEditDialog(false)}>Cancel</Button>
<Button variant="contained" onClick={handleEditSubmit}>Save Edit</Button>
</DialogActions>
</Dialog>

<Dialog open={reportDialog} onClose={()=>setReportDialog(false)} fullWidth maxWidth="sm">
<DialogTitle>Report Repository Question</DialogTitle>
<DialogContent dividers>
<Typography variant="body2" color="text.secondary" gutterBottom>Found a mistake in this global question? Report it to the subject specialists for review.</Typography>
<TextField fullWidth multiline rows={4} label="Reason / Mistake Details" value={reportMsg} onChange={e=>setReportMsg(e.target.value)} sx={{mt:2}}/>
</DialogContent>
<DialogActions sx={{p:2}}>
<Button onClick={()=>setReportDialog(false)}>Cancel</Button>
<Button variant="contained" color="error" onClick={handleReportSubmit} disabled={!reportMsg.trim()}>Report Mistake</Button>
</DialogActions>
</Dialog>
</Box>
);
}
