
all: utils

utils: utils.cc utils.h
	g++ -c utils.cc -std=c++11 -I/Users/miquel/Programas\ Terminal/dynet -o obj/utils.o
	g++ obj/utils.o -o utils -L/Users/miquel/Programas\ Terminal/dynet/build/dynet -ldynet
mnist: train_mnist.cc
	g++ -c train_mnist.cc -std=c++11 -I/Users/miquel/Programas\ Terminal/dynet -o obj/train_mnist.o
	g++ obj/train_mnist.o -o train_mnist -L/Users/miquel/Programas\ Terminal/dynet/build/dynet -ldynet

clean:
	rm -f train_mnist train_mnist.o