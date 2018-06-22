import os
import random

targets = {}
for line in open('../data/train_condition_5.ndx','r'):
    id, file = line.split()
    if id in targets:
        print('not possible')
    else:
        targets[id] = file

# CLIENTS
clients = open('clients-score-list.dat','w')
for line in open('../data/targets_condition5_new.ndx','r'):
    id, file = line.split()
    score_list.write('%s %s\n'%(targets[id],file))
clients.close()

# IMPOSTORS
impostors = open('impostors-score-list.dat','w')
for line in open('../data/nontargets_condition5_new.ndx','r'):
    id, file = line.split()
    impostors.write('%s %s\n'%(targets[id],file))
impostors.close()

