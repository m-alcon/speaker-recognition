import os
import random

targets = {}
for line in open('../data/train_condition_5.ndx','r'):
    id, file = line.split()
    if id in targets:
        print('not possible')
    else:
        targets[id] = file

score_list = open('score-list.dat','w')

# CLIENTS
for line in open('../data/targets_condition5_new.ndx','r'):
    id, file = line.split()
    score_list.write('%s %s\n'%(targets[id],file))

# IMPOSTORS
for line in open('../data/nontargets_condition5_new.ndx','r'):
    id, file = line.split()
    score_list.write('%s %s\n'%(targets[id],file))

score_list.close()

