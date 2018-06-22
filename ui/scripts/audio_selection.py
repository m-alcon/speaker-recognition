import os
from subprocess import call

data = os.listdir('../../neuralnetwork/data/test')
data = list(map(lambda x: x[:-3], data))

audio = os.listdir('../audio/')
audioA = list(map(lambda x: x[:-4]+'_A', audio))
audioB = list(map(lambda x: x[:-4]+'_B', audio))

d = {}
for f in data:
    if f in audioA or f in audioB:
        d[f] = ''

for line in open('../../neuralnetwork/data/train_condition_5.ndx','r'):
    id,file = line.split()
    if file in d:
        d[file] = id

for line in open('../../neuralnetwork/data/targets_condition5_new.ndx','r'):
    id,file = line.split()
    if file in d:
        d[file] = id

remove = [k for k,v in d.items() if v == '']
for k in remove:
    del d[k]

for file in d.keys():
    command = 'cp ../ui/audio/audioWav/'+file[:-2]+'.wav ../ui/audio/'+file[:-2]+'.wav'
    call(command,shell=True)

writer = open('./speaker-audio-list.dat','w')
for _,v in spk_dict.items():
    writer.write(' '.join(v) + '\n')
writer.close()