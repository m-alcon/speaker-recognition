import os
import random

def randomFile(speaker,d):
    return random.choice(d[speaker])

def writeExample(speaker1,speaker2,file):
    file.write('%s %s\n'%(speaker1,speaker2))

def positiveExample(speaker,d,file):
    f1 = randomFile(speaker,d)
    f2 = f1
    while f1 == f2:
        f2 = randomFile(speaker,d)
    writeExample(f1,f2,file)

def negativeExample(speaker,d,file):
    speaker2 = str(speaker)
    while speaker == speaker2:
        speaker2 = random.choice(list(d.keys()))
    writeExample(randomFile(speaker,d),randomFile(speaker2,d),file)


# DATA READING
d = {}
for line in open('../data/2004-2008_labels_final.ndx','r'):
    file, id = line.split()
    if id in d:
        d[id].append(file)
    else:
        d[id] = [file]

# SPEAKER SELECTION (+8 files)
remove = [k for k,v in d.items() if len(v) < 8]
for k in remove:
    del d[k]

# BATCH CREATION
random.seed(1996)
speakers = list(d.keys())

file = open('data.txt','w')
n_examples = 0
while speakers != []:
    i = random.randrange(len(speakers))
    positiveExample(speakers[i],d,file)
    negativeExample(speakers[i],d,file)
    del speakers[i]
    n_examples += 2

speakers = list(d.keys())
while n_examples%20 != 0:
    i = random.randrange(len(speakers))
    positiveExample(speakers[i],d,file)
    negativeExample(speakers[i],d,file)
    del speakers[i]
    n_examples += 2










