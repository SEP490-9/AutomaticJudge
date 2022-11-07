/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package utility;

/**
 *
 * @author Duy
 */
public abstract class InputDescriptor {
    
    @Override
    public abstract java.lang.String toString();
    
    public class Char extends InputDescriptor {
        
        public Char(char min, char max) {
            // TODO
        }
        
        @Override
        public java.lang.String toString() {
            // TODO
            return "";
        }
    }
    
    public class Integer extends InputDescriptor {
        
        public Integer(long min, long max) {
            // TODO
        }
        
        @Override
        public java.lang.String toString() {
            // TODO
            return "";
        }
    }
    
    public class Number extends InputDescriptor {
        
        public Number(double min, double max) {
            // TODO
        }
        
        @Override
        public java.lang.String toString() {
            // TODO
            return "";
        }
    }
    
    public class String extends InputDescriptor {
        
        public String(int minLength, int maxLength, char[] whiteList, java.lang.String regexPattern) {
            // TODO
        }
        
        @Override
        public java.lang.String toString() {
            // TODO
            return "";
        }
    }
    
    public class Matrix extends InputDescriptor {
        
        public Matrix(int rows, int columns, InputDescriptor type) {
            // TODO
        }
        
        @Override
        public java.lang.String toString() {
            // TODO
            return "";
        }
    }
}
