import os
import random

def randomFile(speaker,d,isTest):
    return random.choice(d[speaker][isTest])

def writeExample(speaker1,speaker2,label,file):
    file.write('%s %s %d\n'%(speaker1,speaker2,label))

def positiveExample(speaker,d,file,isTest):
    f1 = randomFile(speaker,d,isTest)
    f2 = f1
    while f1 == f2:
        f2 = randomFile(speaker,d,isTest)
    writeExample(f1,f2,1,file)

def negativeExample(speaker,d,file,isTest):
    speaker2 = str(speaker)
    while speaker == speaker2:
        speaker2 = random.choice(list(d.keys()))
    writeExample(randomFile(speaker,d,isTest),randomFile(speaker2,d,isTest),0,file)

def createData(file,isTest):
    n_examples = 0
    while speakers != []:
        i = random.randrange(len(speakers))
        positiveExample(speakers[i],d,file,isTest)
        negativeExample(speakers[i],d,file,isTest)
        del speakers[i]
        n_examples += 2

    speakers = list(d.keys())
    while n_examples%20 != 0:
        i = random.randrange(len(speakers))
        positiveExample(speakers[i],d,file,isTest)
        negativeExample(speakers[i],d,file,isTest)
        del speakers[i]
        n_examples += 2


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

# TRAIN AND TEST DIVISION
for k,v in d:
    random.shuffle(v)
    sep = int(len(v) * 0.75)
    d[k] = (v[:sep],v[sep:])

# BATCH CREATION
random.seed(1996)
speakers = list(d.keys())

train_file = open('train.dat','w')
createData(train_file,0)
train_file.close()

test_file = open('test.dat','w')
createData(test_file,1)
test_file.close()










