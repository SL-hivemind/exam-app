import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import { useNavigate } from "react-router-dom";

/* ---------------- QUESTIONS ---------------- */

const QUESTIONS = {
  1: [
    {
      type: "tap",
      q: "Tap the RED fruit ",
      options: [
        { e: "🍌", c: "yellow" },
        { e: "🍎", c: "red" },
        { e: "🍇", c: "green" },
        { e: "🍊", c: "orange" }
      ],
      ans: "red"
    },
    {
      type: "count",
      q: "How many dogs are there? ",
      display: "🐶 🐶 🐶",
      options: [2, 3, 4],
      ans: 3
    },
    {
      type: "match",
      q: "Match the animal with its sound 🎵",
      left: ["🐶", "🐱", "🐮", "🐔"],
      right: ["BARK", "MEOW", "MOO", "CLUCK"],
      pairs: {
        "🐶": "BARK",
        "🐱": "MEOW",
        "🐮": "MOO",
        "🐔": "CLUCK"
      }
    },
    {
      type: "tap",
      q: "Tap the BIG animal ",
      options: [
        { e: "🐭", v: "small" },
        { e: "🐘", v: "big" },
        { e: "🐱", v: "small" }
      ],
      ans: "big"
    },
    {
      type: "count",
      q: "How many apples are there? ",
      display: "🍎 🍎 🍎 🍎",
      options: [3, 4, 5],
      ans: 4
    },
    {
      type: "match",
      q: "Match fruit with color 🎨",
      left: ["🍎", "🍌", "🍇", "🍊"],
      right: ["RED", "YELLOW", "GREEN", "ORANGE"],
      pairs: {
        "🍎": "RED",
        "🍌": "YELLOW",
        "🍇": "GREEN",
        "🍊": "ORANGE"
      }
    },
    {
      type: "tap",
      q: "Tap the STAR ",
      options: ["⭐", "🔺", "🔵", "🍎"],
      ans: "⭐"
    },
    {
      type: "count",
      q: "How many cats are there? ",
      display: "🐱 🐱",
      options: [1, 2, 3],
      ans: 2
    },
    {
      type: "tap",
      q: "Tap the YELLOW fruit ",
      options: [
        { e: "🍎", c: "red" },
        { e: "🍌", c: "yellow" },
        { e: "🍇", c: "green" }
      ],
      ans: "yellow"
    },
    {
      type: "tap",
      q: "Tap the CIRCLE ",
      options: ["⬛", "🔺", "🔵", "⭐"],
      ans: "🔵"
    }
  ]
};

[2,3,4,5].forEach(c => (QUESTIONS[c] = QUESTIONS[1]));

/* ---------------- COMPONENT ---------------- */

export default function PrimaryExamFlow() {
  const navigate = useNavigate();

  const [step, setStep] = useState("start");
  const [cls, setCls] = useState(null);
  const [name, setName] = useState("");
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [matched, setMatched] = useState({});
  const [shake, setShake] = useState(false);

  const questions = cls ? QUESTIONS[cls] : [];
  const q = questions[index];

  const next = () => {
    setMatched({});
    setSelectedLeft(null);
    if (index === questions.length - 1) setStep("result");
    else setIndex(i => i + 1);
  };

  const wrong = () => {
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setMatched({});
      setSelectedLeft(null);
    }, 350);
  };

  const handleTap = (opt) => {
  let correct =
    typeof opt === "string"
      ? opt === q.ans
      : opt.c === q.ans || opt.v === q.ans;

  if (correct) {
    setScore(s => s + 1);
    setTimeout(next, 300);
  } else {
    wrong();
  }
};


  const handleCount = (num) => {
  if (num === q.ans) {
    setScore(s => s + 1);
    setTimeout(next, 300);
  } else {
    wrong();
  }
};


 const handleMatch = (right) => {
  if (!selectedLeft) return;

  if (q.pairs[selectedLeft] === right) {
    const updated = { ...matched, [selectedLeft]: true };
    setMatched(updated);
    setSelectedLeft(null);

    if (Object.keys(updated).length === q.left.length) {
      setScore(s => s + 1);
      setTimeout(next, 400);
    }
  } else {
    wrong();
  }
};

  return (
    <Box sx={{
      minHeight:"100vh",
      background:"linear-gradient(120deg,#f472b6,#60a5fa,#34d399)",
      backgroundSize:"300% 300%",
      animation:"bgMove 10s ease infinite",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      px:2,
      "@keyframes bgMove":{
        "0%":{backgroundPosition:"0% 50%"},
        "50%":{backgroundPosition:"100% 50%"},
        "100%":{backgroundPosition:"0% 50%"}
      }
    }}>
      <Paper sx={{
        width:"100%",
        maxWidth:900,
        p:5,
        borderRadius:"32px",
        background:"linear-gradient(180deg,#fff7ed,#ecfeff)",
        boxShadow:"0 30px 60px rgba(0,0,0,0.3)",
        animation: shake ? "shake .3s" : "none",
        "@keyframes shake":{
          "0%":{transform:"translateX(0)"},
          "25%":{transform:"translateX(-6px)"},
          "50%":{transform:"translateX(6px)"},
          "75%":{transform:"translateX(-6px)"},
          "100%":{transform:"translateX(0)"}
        }
      }}>

        {/* START */}
        {step==="start" && (
          <>
            <Typography variant="h3" fontWeight={900} mb={1}>
              🎈 Fun Kids Exam 🎈
            </Typography>
            <Typography mb={3}>Let’s play and learn together 🧠✨</Typography>

            <Grid container spacing={2} justifyContent="center" mb={3}>
              {[1,2,3,4,5].map(c=>(
                <Grid item key={c}>
                  <Button
                    variant={cls===c?"contained":"outlined"}
                    onClick={()=>setCls(c)}
                    sx={{ borderRadius:3, px:3, fontWeight:700 }}
                  >
                    Class {c}
                  </Button>
                </Grid>
              ))}
            </Grid>

            <TextField
              label="Your Name 😊"
              fullWidth
              value={name}
              onChange={e=>setName(e.target.value)}
              sx={{ mb:3 }}
            />

            <Button
              size="large"
              variant="contained"
              disabled={!cls || !name}
              sx={{ px:6, borderRadius:4, fontWeight:800 }}
              onClick={()=>setStep("exam")}
            >
              🚀 Start Playing
            </Button>
          </>
        )}

        {/* EXAM */}
        {step==="exam" && (
          <>
            <Typography fontWeight={700} mb={1}>
              Question {index+1} / {questions.length}
            </Typography>

            <Typography variant="h4" fontWeight={900} mb={4}>
              {q.q}
            </Typography>

            {q.type==="count" && (
              <>
                <Typography fontSize={48} mb={3}>{q.display}</Typography>
                <Grid container spacing={3} justifyContent="center">
                  {q.options.map(n=>(
                    <Grid item key={n}>
                      <Box
                        onClick={()=>handleCount(n)}
                        sx={{
                          width:100,
                          height:100,
                          borderRadius:"50%",
                          display:"flex",
                          alignItems:"center",
                          justifyContent:"center",
                          fontSize:36,
                          fontWeight:900,
                          bgcolor:"#fff",
                          cursor:"pointer",
                          "&:hover":{ transform:"scale(1.15)", bgcolor:"#fef3c7" }
                        }}
                      >
                        {n}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}

            {q.type==="tap" && (
              <Grid container spacing={3} justifyContent="center">
                {q.options.map((o,i)=>(
                  <Grid item xs={6} sm={3} key={i}>
                    <Box
                      onClick={()=>handleTap(o)}
                      sx={{
                        height:130,
                        fontSize:64,
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"center",
                        bgcolor:"#fff",
                        borderRadius:4,
                        cursor:"pointer",
                        "&:hover":{ transform:"scale(1.15)", bgcolor:"#ecfeff" }
                      }}
                    >
                      {typeof o==="string"?o:o.e}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}

            {q.type==="match" && (
              <Grid container spacing={4} justifyContent="center">
                <Grid item xs={12} md={5}>
                  {q.left.map(l=>(
                    <Box
                      key={l}
                      onClick={()=>setSelectedLeft(l)}
                      sx={{
                        p:2,
                        mb:2,
                        fontSize:48,
                        textAlign:"center",
                        borderRadius:3,
                        cursor:"pointer",
                        bgcolor: matched[l]
                          ? "#bbf7d0"
                          : selectedLeft===l
                          ? "#fde68a"
                          : "#fff"
                      }}
                    >
                      {l}
                    </Box>
                  ))}
                </Grid>
                <Grid item xs={12} md={5}>
                  {q.right.map(r=>(
                    <Box
                      key={r}
                      onClick={()=>handleMatch(r)}
                      sx={{
                        p:2,
                        mb:2,
                        textAlign:"center",
                        fontWeight:900,
                        borderRadius:3,
                        cursor:"pointer",
                        bgcolor:"#fff",
                        "&:hover":{ bgcolor:"#f0fdfa" }
                      }}
                    >
                      {r}
                    </Box>
                  ))}
                </Grid>
              </Grid>
            )}
          </>
        )}

        {/* RESULT */}
        {step==="result" && (
          <>
            <Typography variant="h3" fontWeight={900} mb={2}>
              🎉 Great Job {name}! 🎉
            </Typography>
            <Typography variant="h4" mb={2}>
              ⭐ {score} / {questions.length} ⭐
            </Typography>
            <Typography fontSize={22} mb={4}>
              🐶🍎⭐ You did amazing!  
              <br />
              Come back soon to play again 🎈🎈🎈
            </Typography>
            <Button
              size="large"
              variant="contained"
              sx={{ px:6, borderRadius:4 }}
              onClick={()=>navigate("/")}
            >
              🏠 Go Home
            </Button>
          </>
        )}

      </Paper>
    </Box>
  );
}
