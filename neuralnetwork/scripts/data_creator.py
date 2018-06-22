import os
import random

def randomFile(speaker,d,isTest):
    choice = random.choice(d[speaker][isTest])
    print(choice)
    return choice

def writeExample(speaker1,speaker2,label,file):
    file.write('%s %s %d\n'%(speaker1,speaker2,label))

def positiveExample(speaker,d,file,isTest):
    if isTest:
        i = random.randrange(0,2)
        f1 = d[speaker][isTest][i]
        f2 = d[speaker][isTest][not i]
    else:
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

def createDataTrain(file):
    isTest = 0
    n_examples = 0
    speakers = list(d.keys())
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

def createDataTest(file):
    isTest = 1
    n_examples = 0
    speakers = list(d.keys())
    while speakers != []:
        i = random.randrange(len(speakers))
        positiveExample(speakers[i],d,file,isTest)
        del speakers[i]
        j = random.randrange(len(speakers))
        negativeExample(speakers[j],d,file,isTest)
        del speakers[j]
        n_examples += 2
    print('while1')
    speakers = list(d.keys())
    while n_examples%20 != 0:
        i = random.randrange(len(speakers))
        positiveExample(speakers[i],d,file,isTest)
        del speakers[i]
        j = random.randrange(len(speakers))
        negativeExample(speakers[j],d,file,isTest)
        del speakers[j]
        n_examples += 2
    print('while2')

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

# AUX READ C++
speakers = list(d.keys())
random.shuffle(speakers)
barrier = int( len(speakers)*0.8)

loader_train = open('loader-train.dat','w')
for speaker in speakers[:barrier]:
    for sfile in d[speaker]:
        loader_train.write(sfile+' ')
    loader_train.write("\n")
loader_train.close()

loader_test = open('loader-test.dat','w')
for speaker in speakers[barrier:]:
    for sfile in d[speaker]:
        loader_test.writchoe(sfile+' ')
    loader_test.write("\n")

# DATA FOR APP READING
# d = {}
# for line in open('../data/targets_condition5_new.ndx','r'):
#     id, file = line.split()
#     if id in d:
#         d[id].append(file)
#     else:
#         d[id] = [file]

# app = open('../ui/app-speakers.dat','w')
# for i,speaker in enumerate(list(d.keys())):
#     line = "speaker%d "%i
#     for sfile in d[speaker]:
#         line += sfile+' '
#     app.write(line[:-1] + '\n')

# # TRAIN AND TEST DIVISION
# for k,v in d.items():
#     random.shuffle(v)
#     d[k] = (v[:6],v[6:8])

# # BATCH CREATION
# random.seed(1996)

# train_file = open('train.dat','w')
# createDataTrain(train_file)
# train_file.close()

# test_file = open('test.dat','w')
# createDataTest(test_file)
# test_file.close()










