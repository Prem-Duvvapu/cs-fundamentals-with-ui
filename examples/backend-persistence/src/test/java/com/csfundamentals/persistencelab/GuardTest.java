package com.csfundamentals.persistencelab;

import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class GuardTest {
    @Test void requiresOwnedLoopbackDatabaseMatchingRoleAndGeneratedSecret() {
        String id=UUID.randomUUID().toString().replace("-","");
        String url="jdbc:postgresql://127.0.0.1:5432/lab_persist_"+id+"_source",user="lab_persist_role_"+id;
        assertEquals(url,new TestSettings(url,user,UUID.randomUUID().toString()).url());
        for(String invalid:new String[]{url.replace("127.0.0.1","remote.invalid"),url+"?options=unsafe",url.replace("lab_persist_"+id+"_source","postgres")}) {
            assertThrows(IllegalArgumentException.class,()->new TestSettings(invalid,user,UUID.randomUUID().toString()));
        }
        assertThrows(IllegalArgumentException.class,()->new TestSettings(url,"postgres",UUID.randomUUID().toString()));
        assertThrows(IllegalArgumentException.class,()->new TestSettings(url,user,null));
    }
    @Test void refusesGlobalOrInjectedSchemaNames() {
        for(String name:new String[]{"public","lab_schema_abc;DROP SCHEMA public", "lab_schema_"})assertThrows(IllegalArgumentException.class,()->TestSettings.ownedSchema(name));
    }
}
