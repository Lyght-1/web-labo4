const utilities = require("../utilities");
const serverVariables = require("../serverVariables");
const { v1: uuidv1 } = require('uuid');
const fs = require('fs');
///////////////////////////////////////////////////////////////////////////
// This class provide CRUD operations on JSON objects collection text file 
// with the assumption that each object have an Id member.
// If the objectsFile does not exist it will be created on demand.
// Warning: no type and data validation is provided
///////////////////////////////////////////////////////////////////////////

let CacheExpirationTime = serverVariables.get("main.cache.expirationTime");
let repositoryEtags = {};
let repositoryCache = []; 
class Repository {
    constructor(objectsName,cached = true) {
        this.cached = cached;
        this.objectsName = objectsName.toLowerCase();
        this.objectsList = [];
        this.objectsFile = `./data/${this.objectsName}.json`;
        this.initEtag();
        this.read();
    }

    initEtag() {
        this.ETag = "";
        if (this.objectsName in repositoryEtags)
            this.ETag = repositoryEtags[this.objectsName];
        else
            this.newETag();
    }

    newETag(){
        this.ETag = uuidv1();
        repositoryEtags[this.objectsName] = this.ETag;
    }

    read() {
        try{
            this.objectsList = null;
            if(this.cached && repositoryCache[this.objectsName] != null){
                this.objectsList = repositoryCache[this.objectsName].content;     
            }

            if(this.objectsList == null){
                let rawdata = fs.readFileSync(this.objectsFile);
                this.objectsList = JSON.parse(rawdata);
                if(this.cached){
                    repositoryCache[this.objectsName] = {content: this.objectsList, expireIn: utilities.nowInSeconds() + CacheExpirationTime};
                }
            }
            // we assume here that the json data is formatted correctly
        } catch(error) {
            if (error.code === 'ENOENT') {
                // file does not exist, it will be created on demand
                this.objectsList = [];
            }
        }
    }
    write() {
        // Here we use the synchronus version writeFile in order
        // to avoid concurrency problems  
        this.newETag();
        fs.writeFileSync(this.objectsFile, JSON.stringify(this.objectsList));
        repositoryCache[this.objectsName] = null;
        this.read();
    }
    nextId() {
        let maxId = 0;
        for(let object of this.objectsList){
            if (object.Id > maxId) {
                maxId = object.Id;
            }
        }
        return maxId + 1;
    }
    add(object) {
        try {
            object.Id = this.nextId();
            this.objectsList.push(object);
            this.write();
            return object;
        } catch(error) {
            return null;
        }
    }
    getAll() {
        return this.objectsList;
    }
    get(id){
        for(let object of this.objectsList){
            if (object.Id === id) {
               return object;
            }
        }
        return null;
    }
    remove(id) {
        let index = 0;
        for(let object of this.objectsList){
            if (object.Id === id) {
                this.objectsList.splice(index,1);
                this.write();
                return true;
            }
            index ++;
        }
        return false;
    }
    removeByIndex(indexToDelete){
        utilities.deleteByIndex(this.objectsList, indexToDelete);
        this.write();
    }
    update(objectToModify) {
        let index = 0;
        for(let object of this.objectsList){
            if (object.Id === objectToModify.Id) {
                this.objectsList[index] = objectToModify;
                this.write();
                return true;
            }
            index ++;
        }
        return false;
    } 
    findByField(fieldName, value){
        let index = 0;
        for(let object of this.objectsList){
            try {
                if (object[fieldName] === value) {
                    return this.objectsList[index];
                }
                index ++;
            } catch(error) {
                break;
            }
        }
        return null;
    }

    static flushExpired() {
        let now = utilities.nowInSeconds();
        for(let cache in repositoryCache){
            if (repositoryCache[cache] != null && repositoryCache[cache].expireIn < now) {
                console.log("Cached " +cache + " expired");
                repositoryCache[cache]=null;
            }
        }
    }
}

// periodic cleaning of expired cached GET request
setInterval(Repository.flushExpired, CacheExpirationTime * 1000);
module.exports = Repository;