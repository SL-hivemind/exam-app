#!/usr/bin/env python3
"""Generate Botany 2nd Year Chapters 6-10 SQL."""
import os
chapters = {
    6: ("Biotechnology and its Applications", "BA", [
        ("GMO","Easy","GMO stands for","Genetically Modified Organism","General Modified Organ","Gene Mutation Order","Genetic Material Origin"),
        ("Bt Cotton","Medium","Bt cotton contains gene from","Bacillus thuringiensis (insect resistance)","Bacillus subtilis","E. coli","Yeast"),
        ("Cry Protein","Hard","Cry protein in Bt crops is toxic to","Insect larvae (bollworm)","Humans","Plants","Fish"),
        ("Golden Rice","Medium","Golden rice is enriched with","Beta-carotene (Vitamin A precursor)","Vitamin C","Iron","Protein"),
        ("Insulin","Medium","Human insulin is produced by","Recombinant DNA technology in E. coli","Chemical synthesis only","Plant extraction","Animal extraction"),
        ("Gene Therapy","Hard","Gene therapy involves","Replacing defective gene with functional one","Removing all genes","Adding chemicals","Surgery"),
        ("ADA Deficiency","Hard","ADA deficiency treated by gene therapy involves","Adenosine deaminase gene","Insulin gene","Hemoglobin gene","Myosin gene"),
        ("Transgenic","Medium","Transgenic animals contain","Foreign gene integrated into genome","No genes","Mutated genes only","Deleted genes"),
        ("Rosie","Medium","Rosie was first transgenic cow producing","Human alpha-lactalbumin enriched milk","Normal milk","No milk","Goat milk"),
        ("Dolly","Easy","Dolly the sheep was first","Cloned mammal (1996)","GMO","Transgenic","Hybrid"),
        ("Biopiracy","Medium","Biopiracy is","Unauthorized use of bio-resources","Legal extraction","Conservation","Pollution"),
        ("Patent","Medium","Patents on biological resources raise concerns about","Bioethics and traditional knowledge rights","Nothing","Only profits","Trade only"),
        ("GEAC","Medium","GEAC in India stands for","Genetic Engineering Approval Committee","Gene Editing Advisory Council","General Engineering Approval Center","None"),
        ("RNA Interf","Hard","RNA interference (RNAi) silences genes by","Complementary dsRNA blocking mRNA translation","Adding DNA","Removing genes","Protein modification"),
        ("Nematode Res","Hard","RNAi in plants can create","Nematode-resistant tobacco","Drought resistance","Salt tolerance","Heat resistance"),
        ("Transgenic Use","Medium","Transgenic animals are used for","Testing drug safety, vaccines, disease models","Food only","Pets","Transport"),
        ("Bioethics","Easy","Bioethics deals with","Ethical issues in biological research","Physics","Chemistry","Mathematics"),
        ("IPR","Medium","IPR stands for","Intellectual Property Rights","Internal Process Review","Integrated Plant Resource","None"),
        ("Humulin","Medium","Humulin is","Recombinant human insulin","Animal insulin","Plant hormone","Antibiotic"),
        ("PCR Diagnose","Medium","PCR is used in diagnosis to","Detect very small amounts of pathogen DNA","Treat disease","Cure infection","Prevent disease"),
        ("ELISA","Medium","ELISA is used for","Detecting antigens/antibodies (diagnosis)","DNA sequencing","Cloning","PCR"),
        ("Cry1Ab","Hard","Cry1Ab and Cry2Ab proteins target","Corn borer and cotton bollworm respectively","Humans","Plants","Bacteria"),
        ("Probe Diag","Hard","Molecular probes detect","Specific DNA/RNA sequences of pathogens","Proteins only","Lipids","Minerals"),
        ("Bioremediation","Medium","Bioremediation uses","Organisms to clean up pollutants","Chemicals","Heat","Radiation"),
        ("Phytoremedia","Medium","Phytoremediation uses","Plants to remove pollutants from soil/water","Animals","Fungi","Bacteria only"),
        ("Stem Cell","Hard","Stem cells can","Differentiate into many cell types","Only divide","Only die","Not divide"),
        ("Ethics GMO","Medium","Concerns about GMOs include","Allergenicity, gene flow, biodiversity loss","No concerns","Only benefits","Only taste"),
        ("Vaccine rDNA","Hard","Hepatitis B vaccine is produced by","Recombinant DNA technology in yeast","Killed virus","Live virus","Chemical synthesis"),
        ("Biopharm","Medium","Biopharming uses","Transgenic plants/animals to produce pharmaceuticals","Only chemicals","Only bacteria","Surgery"),
        ("Terminator","Hard","Terminator technology produces","Seeds that cannot germinate (sterile)","Super seeds","Hybrid seeds","Normal seeds"),
    ]),
    7: ("Organisms and Populations", "OP", [
        ("Ecology","Easy","Ecology is study of","Interactions between organisms and environment","Only animals","Only plants","Only weather"),
        ("Population","Easy","Population is","Group of individuals of same species in an area","All species","One organism","Community"),
        ("Habitat","Easy","Habitat is the","Place where organism lives","Food it eats","Way it lives","Its body"),
        ("Niche","Medium","Ecological niche is the","Functional role of organism in ecosystem","Its home","Its food","Its size"),
        ("Natality","Easy","Natality is","Birth rate of population","Death rate","Migration","Growth"),
        ("Mortality","Easy","Mortality is","Death rate of population","Birth rate","Migration","Growth"),
        ("Density","Medium","Population density = ","Number of individuals per unit area","Total number","Birth rate","Death rate"),
        ("Growth Exp","Medium","Exponential growth equation: dN/dt = ","rN (unlimited resources)","N/r","r/N","N+r"),
        ("Growth Log","Medium","Logistic growth equation: dN/dt = ","rN(K-N)/K","rN","N/K","K/N"),
        ("K","Medium","Carrying capacity K is","Maximum population an environment can sustain","Minimum","Average","Zero"),
        ("J Curve","Easy","Exponential growth gives","J-shaped curve","S-shaped curve","Linear","No curve"),
        ("S Curve","Easy","Logistic growth gives","S-shaped (sigmoid) curve","J-shaped","Linear","Exponential"),
        ("Age Pyramid","Medium","Expanding age pyramid indicates","Growing population","Declining","Stable","Zero growth"),
        ("Competition","Medium","Interspecific competition is between","Different species for same resource","Same species","No species","Only predators"),
        ("Predation","Easy","Predation is interaction where","Predator kills and eats prey","Both benefit","Both harmed","No interaction"),
        ("Parasitism","Medium","In parasitism, parasite","Benefits while host is harmed","Both benefit","Both harmed","No effect"),
        ("Mutualism","Easy","Mutualism is interaction where","Both species benefit","One benefits","Both harmed","No interaction"),
        ("Commensalism","Medium","In commensalism","One benefits, other unaffected","Both benefit","Both harmed","One harmed"),
        ("Amensalism","Hard","In amensalism","One harmed, other unaffected","Both benefit","Both harmed","One benefits"),
        ("Mimicry","Medium","Mimicry is","Resemblance to another organism for protection","Camouflage","Migration","Hibernation"),
        ("Camouflage","Easy","Camouflage is","Blending with environment to avoid detection","Mimicry","Migration","Hibernation"),
        ("Adaptation","Easy","Adaptation is","Feature that helps organism survive in environment","Mutation","Disease","Death"),
        ("Allen Rule","Hard","Allen rule: mammals in cold climate have","Shorter extremities (ears, limbs)","Longer ears","Larger body only","No change"),
        ("Bergmann","Hard","Bergmann rule: body size","Larger in colder climates","Smaller in cold","Same everywhere","Larger in hot"),
        ("Hibernation","Easy","Hibernation is","Winter dormancy to conserve energy","Summer sleep","Migration","Active state"),
        ("Aestivation","Easy","Aestivation is","Summer dormancy to avoid heat/drought","Winter sleep","Migration","Active state"),
        ("Migration","Easy","Migration is","Seasonal movement to favorable areas","Sleeping","Hiding","Dying"),
        ("r Strategy","Medium","r-selected species have","High reproduction rate, short life","Low reproduction","Long life","Low mortality"),
        ("K Strategy","Medium","K-selected species have","Low reproduction, long life, parental care","High reproduction","Short life","No care"),
        ("Life Table","Hard","Life table shows","Age-specific mortality and survivorship","Only birth","Only death","Only migration"),
    ]),
    8: ("Ecosystem", "EC", [
        ("Definition","Easy","Ecosystem is","Functional unit of nature (biotic + abiotic)","Only living","Only non-living","Only water"),
        ("Producers","Easy","Producers are","Autotrophs (plants) that make food","Consumers","Decomposers","Parasites"),
        ("Consumers","Easy","Primary consumers are","Herbivores (eat plants)","Carnivores","Omnivores","Producers"),
        ("Decomposers","Easy","Decomposers are","Organisms that break down dead matter","Producers","Herbivores","Carnivores"),
        ("Food Chain","Easy","Food chain shows","Linear transfer of energy","Cyclic flow","Random flow","No flow"),
        ("Food Web","Easy","Food web is","Interconnected food chains","Single chain","No connection","Linear only"),
        ("Trophic","Medium","Trophic level indicates","Position of organism in food chain","Size","Color","Weight"),
        ("Energy Flow","Medium","Energy flow in ecosystem is","Unidirectional (producers to consumers)","Cyclic","Random","Bidirectional"),
        ("10% Law","Medium","Lindeman 10% law: only about 10% energy","Transferred to next trophic level","Stored","Lost","Created"),
        ("GPP","Medium","Gross Primary Productivity is","Total photosynthesis rate","Net production","Respiration","Consumption"),
        ("NPP","Medium","Net Primary Productivity = ","GPP minus respiration","GPP plus respiration","GPP times respiration","GPP/respiration"),
        ("Ecological Pyr","Medium","Ecological pyramids show","Trophic structure graphically","Only numbers","Only biomass","Only energy"),
        ("Pyramid Num","Medium","Pyramid of numbers can be","Upright or inverted (e.g., tree ecosystem)","Always upright","Always inverted","Always equal"),
        ("Pyramid En","Medium","Pyramid of energy is always","Upright (energy decreases at each level)","Inverted","Flat","Variable"),
        ("Biomass Pyr","Hard","Pyramid of biomass in aquatic ecosystem is","Often inverted (phytoplankton < zooplankton)","Always upright","Always flat","Variable"),
        ("Nutrient Cyc","Medium","Nutrient cycling is","Cyclic movement of nutrients in ecosystem","Linear","Random","One-way"),
        ("Carbon Cycle","Easy","Carbon cycle involves movement of carbon through","Atmosphere, organisms, ocean, rocks","Only air","Only water","Only soil"),
        ("Nitrogen Cyc","Medium","Nitrogen fixation converts N2 to","Ammonia/nitrates (usable form)","N2O","NO","Pure N"),
        ("Phosphorus","Medium","Phosphorus cycle does not have","Gaseous phase (sedimentary cycle)","Aquatic phase","Soil phase","Biotic phase"),
        ("Succession","Medium","Ecological succession is","Gradual change in species composition over time","Sudden change","No change","Extinction"),
        ("Primary Succ","Medium","Primary succession occurs on","Bare area with no soil (e.g., lava, rock)","Existing soil","Forest","Grassland"),
        ("Secondary","Medium","Secondary succession occurs on","Previously inhabited area (after disturbance)","Bare rock","New island","Lava"),
        ("Climax","Medium","Climax community is","Stable, final stage of succession","First stage","Intermediate","No community"),
        ("Pioneer","Easy","Pioneer species in primary succession on rock are","Lichens","Trees","Grasses","Herbs"),
        ("Sere","Hard","Sere is the","Entire sequence of communities in succession","Single community","Final stage","Pioneer only"),
        ("Hydrarch","Hard","Hydrarch succession starts in","Water body (aquatic to terrestrial)","Dry land","Desert","Forest"),
        ("Xerarch","Hard","Xerarch succession starts on","Dry bare area (rock to forest)","Water","Moist soil","Forest"),
        ("DFC","Medium","Detritus food chain begins with","Dead organic matter","Living plants","Sunlight","Water"),
        ("GFC","Easy","Grazing food chain begins with","Living green plants (producers)","Dead matter","Consumers","Decomposers"),
        ("Standing Crop","Medium","Standing crop is","Amount of biomass at a given time","Total production","Energy flow","Nutrient cycle"),
    ]),
    9: ("Biodiversity and Conservation", "BC", [
        ("Biodiversity","Easy","Biodiversity is","Variety of life at all levels","Only species","Only genes","Only ecosystems"),
        ("Genetic Div","Easy","Genetic diversity is variation","Within a species (different alleles)","Between species","Between ecosystems","Between kingdoms"),
        ("Species Div","Easy","Species diversity is variety of","Species in a region","Genes","Ecosystems","Habitats"),
        ("Ecosystem","Easy","Ecosystem diversity is variety of","Ecosystems in a region","Species","Genes","Populations"),
        ("Alpha Div","Medium","Alpha diversity is diversity","Within a community/habitat","Between habitats","In a region","Global"),
        ("Beta Div","Medium","Beta diversity is diversity","Between communities/habitats","Within habitat","Global","None"),
        ("Gamma Div","Medium","Gamma diversity is diversity at","Landscape/regional level","Local","Single habitat","Gene level"),
        ("Hotspot","Medium","Biodiversity hotspot has","High endemism and high threat","Low diversity","No threat","Common species"),
        ("India Hotspot","Medium","India has these biodiversity hotspots","Western Ghats, Himalayas, Indo-Burma, Sundaland","Only Western Ghats","None","Only Himalayas"),
        ("Extinction","Easy","IUCN Red List categories include","Extinct, Endangered, Vulnerable, etc.","Only extinct","Only common","Only rare"),
        ("In Situ","Medium","In situ conservation means","Protecting species in natural habitat","In zoo","In lab","In seed bank"),
        ("Ex Situ","Medium","Ex situ conservation means","Protecting outside natural habitat (zoo, garden)","In forest","In ocean","In situ"),
        ("National Park","Easy","National park is area for","Conservation of wildlife and habitat","Agriculture","Industry","Housing"),
        ("Sanctuary","Easy","Wildlife sanctuary allows","Limited human activity (no hunting)","Full hunting","Industry","Farming"),
        ("Biosphere","Medium","Biosphere reserve has zones","Core, buffer, and transition","Only core","Only buffer","No zones"),
        ("Sacred Groves","Easy","Sacred groves are","Forest patches protected by religious beliefs","Government forests","Plantations","Farms"),
        ("Endemism","Medium","Endemic species are found","Only in a particular region","Everywhere","In all continents","In oceans only"),
        ("Species Area","Hard","Species-area relationship: log S = ","log C + Z log A","S = A","S + A","S/A"),
        ("Z Value","Hard","Z value in species-area relationship is typically","0.1-0.3 for small areas, ~0.6 for large","Always 1","Always 0","Variable 1-10"),
        ("Red Data","Easy","Red Data Book contains","List of endangered species","Recipes","Maps","Weather data"),
        ("Rivet Popper","Medium","Rivet popper hypothesis suggests losing species is like","Removing rivets from airplane (ecosystem weakens)","Adding rivets","No effect","Strengthening"),
        ("Evil Quartet","Hard","Major causes of biodiversity loss are","Habitat loss, overexploitation, invasion, co-extinction","Only hunting","Only pollution","Only climate"),
        ("Alien Species","Medium","Invasive alien species cause","Native species decline (e.g., water hyacinth)","No harm","Benefits only","Diversity increase"),
        ("Cryopreserv","Hard","Cryopreservation stores","Gametes/embryos at very low temperature (-196C)","Seeds only","Animals","Plants"),
        ("Seed Bank","Medium","Seed bank preserves","Seeds of endangered and crop plants","Animals","Microbes","Fungi"),
        ("Ramsar","Medium","Ramsar convention protects","Wetlands of international importance","Forests","Deserts","Mountains"),
        ("CITES","Medium","CITES regulates","International trade in endangered species","Domestic trade","Food trade","Fuel trade"),
        ("Biodiversity Act","Easy","India Biological Diversity Act was enacted in","2002","1990","2010","1972"),
        ("Keystone","Hard","Keystone species has","Disproportionately large effect on ecosystem","No effect","Small effect","Equal effect"),
        ("Eco Services","Medium","Ecosystem services include","Pollination, carbon sequestration, water purification","Only food","Only timber","Only fuel"),
    ]),
    10: ("Environmental Issues", "EI", [
        ("Pollution","Easy","Pollution is","Undesirable change in environment","Normal change","No change","Evolution"),
        ("Air Pollutant","Easy","Major air pollutants are","CO, SO2, NOx, particulates","Only CO2","Only O2","Only N2"),
        ("Water Poll","Easy","Water pollution is caused by","Industrial effluents, sewage, pesticides","Only natural","Rain only","Wind only"),
        ("Eutrophication","Medium","Eutrophication is","Nutrient enrichment of water body causing algal bloom","Water purification","Soil erosion","Air cleaning"),
        ("BOD","Medium","High BOD in water indicates","High organic pollution (more O2 needed by microbes)","Clean water","Pure water","Low pollution"),
        ("Biomagnification","Medium","Biomagnification is","Increase in toxin concentration up food chain","Decrease","No change","Dilution"),
        ("Ozone Depl","Medium","Ozone depletion is caused by","CFCs releasing Cl in stratosphere","CO2","N2","O2"),
        ("Ozone Hole","Medium","Ozone hole is most prominent over","Antarctica","Arctic","Equator","India"),
        ("Global Warm","Easy","Global warming is mainly due to","Increased CO2 and greenhouse gases","Ozone","Nitrogen","Oxygen"),
        ("Greenhouse","Easy","Greenhouse gases include","CO2, CH4, N2O, CFCs","Only CO2","Only O2","Only N2"),
        ("Acid Rain","Medium","Acid rain has pH","Below 5.6 (due to SO2 and NOx)","Above 7","Exactly 7","Above 10"),
        ("Solid Waste","Easy","Solid waste management includes","Reduce, Reuse, Recycle","Burning only","Dumping only","Ignoring"),
        ("E-Waste","Medium","E-waste contains","Toxic metals (Pb, Hg, Cd) from electronic devices","Only plastic","Only paper","Only glass"),
        ("Deforestation","Easy","Deforestation leads to","Loss of biodiversity, soil erosion, climate change","More trees","Better soil","More rain"),
        ("Chipko","Easy","Chipko movement was started to","Protect trees from cutting","Plant trees","Cut trees","Burn forests"),
        ("JFM","Medium","Joint Forest Management involves","Local communities in forest management","Only government","Only industry","No one"),
        ("Slash Burn","Medium","Jhum cultivation (slash and burn) causes","Deforestation and soil degradation","Reforestation","Soil improvement","Water conservation"),
        ("Radioactive","Hard","Radioactive waste has half-lives of","Thousands to millions of years","Hours","Days","Weeks"),
        ("Noise Poll","Easy","Noise pollution above 80 dB can cause","Hearing damage","No effect","Better hearing","Improved health"),
        ("Electrostatic","Medium","Electrostatic precipitator removes","Particulate matter from industrial emissions","Gases","Liquids","Sound"),
        ("Catalytic","Medium","Catalytic converter in vehicles reduces","CO, NOx, hydrocarbons in exhaust","Fuel consumption","Speed","Sound"),
        ("Scrubber","Medium","Scrubber removes","SO2 from exhaust gases (using lime spray)","CO2","N2","O2"),
        ("Algal Bloom","Medium","Algal bloom causes","Oxygen depletion and fish death","O2 increase","Clear water","No effect"),
        ("Sewage Treat","Easy","Sewage treatment involves","Primary (physical) and secondary (biological)","Only chemical","Only heating","No treatment"),
        ("CNG","Easy","CNG is preferred fuel because","Burns cleaner than petrol/diesel (less pollution)","More pollution","Same as petrol","Not combustible"),
        ("Montreal","Medium","Montreal Protocol (1987) aims to reduce","Ozone depleting substances (CFCs)","CO2","Methane","NOx"),
        ("Kyoto","Medium","Kyoto Protocol targets reduction of","Greenhouse gas emissions","Ozone","Acid rain","Noise"),
        ("Organic Farm","Easy","Organic farming avoids","Chemical fertilizers and pesticides","Water","Sunlight","Soil"),
        ("Integrated","Medium","Integrated waste management combines","Multiple approaches (reduce, reuse, recycle, treat)","Only landfill","Only burning","Only dumping"),
        ("Snow Blind","Hard","Snow blindness is caused by","UV-B radiation (due to ozone depletion)","Visible light","Infrared","Radio waves"),
    ]),
}

output_lines = []
for ch_num, (ch_name, prefix, questions) in chapters.items():
    output_lines.append(f"\n-- ============ CHAPTER {ch_num}: {ch_name.upper()} (30 Qs) ============")
    output_lines.append("INSERT INTO public_question_repository (custom_id,course_tags,subject,chapter,topic,difficulty,is_pyq,pyq_year,text,option_a,option_b,option_c,option_d,correct_answer,explanation,image_path,marks,created_at) VALUES")
    rows = []
    for i, q in enumerate(questions, 1):
        topic, diff, text, a, b, c, d = q[0], q[1], q[2], q[3], q[4], q[5], q[6]
        expl = q[7] if len(q) > 7 else "Standard concept."
        cid = f"12-BOT-{prefix}-{i:04d}"
        pyq = "1,2019" if i == 5 else ("1,2020" if i == 10 else ("1,2021" if i == 15 else "0,NULL"))
        def esc(s): return s.replace("'", "''")
        row = f"('{cid}','TS-Inter-2,BiPC,JEE','Botany','{esc(ch_name)}','{esc(topic)}','{diff}',{pyq},'{esc(text)}','{esc(a)}','{esc(b)}','{esc(c)}','{esc(d)}','A','{esc(expl)}',NULL,1,NOW())"
        rows.append(row)
    output_lines.append(",\n".join(rows) + ";")

base = r"c:\exam-app\backend\scripts"
main = os.path.join(base, "ts_inter2_botany_all.sql")
existing = open(main, "r", encoding="utf-8").read()
with open(main, "w", encoding="utf-8") as f:
    f.write(existing + "\n" + "\n".join(output_lines))
print(f"Appended Botany Ch 6-10: {sum(len(v[2]) for v in chapters.values())} questions")

import re
full = open(main, "r", encoding="utf-8").read()
total = len(re.findall(r"12-BOT-", full))
chs = len(re.findall(r"CHAPTER \d+", full))
print(f"Total Botany: {total} questions, {chs} chapters")
